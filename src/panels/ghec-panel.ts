import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { buildConfig, getGhToken, GhecConfig } from '../services/ghec-config';
import {
  testConnectivity, getWorkflowRuns, getLastRuns, getRunErrors,
  pollRun, findRunBySha, getOpenPr, createPr, BuildError, BuildSummary,
  computeProposedFix,
} from '../services/ghec-service';
import {
  getStatus, pushCurrentBranch,
  applyPathFix, commitFixes, commitAndPush,
  delinkAtLine, getUncommittedFiles, applyLineFix,
} from '../services/git-service';
import { buildClaudeClient, loadRepairContext, ANTHROPIC_KEY_SECRET, OPENAI_KEY_SECRET } from '../services/claude-service';
import { runLocalLint } from '../services/local-lint-service';
import { output } from '../lib/common';

export class GhecPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _config: GhecConfig | null = null;
  private _cwd: string;
  private _buildRunning = false;
  private _dataLoaded = false;
  private _lastErrors: BuildError[] = [];
  private _lastRunId = 0;
  // Diagnostics collection — publishes CI/lint errors into VS Code's Problems
  // panel so any AI tool (Copilot, Claude Code, Cursor) can read and fix them.
  private readonly _diagnostics = vscode.languages.createDiagnosticCollection('exl-ci');

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    _context.subscriptions.push(this._diagnostics);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    const mediaUri = vscode.Uri.joinPath(this._context.extensionUri, 'media');
    const assetsUri = vscode.Uri.joinPath(this._context.extensionUri, 'assets');
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [mediaUri, assetsUri] };
    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'refresh':         await this._handleRefresh(); break;
        case 'pushCheck':       await this._handlePushCheck(); break;
        case 'autoFix':         await this._handleAutoFix(); break;
        case 'applyFixes':      await this._handleApplyFixes(); break;
        case 'applyOneFix':     await this._handleApplyOneFix(msg.action, msg.filepath, msg.lineno, msg.candidate, msg.target); break;
        case 'commitAndPush':   await this._handleCommitAndPush(); break;
        case 'openFile':        await this._openFile(msg.filepath, msg.line); break;
        case 'openUrl':         void vscode.env.openExternal(vscode.Uri.parse(msg.url)); break;
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) { void this._handleRefresh(); }
    });

    void this._handleRefresh();
  }

  // ── Message helpers ────────────────────────────────────────────────────────

  private _post(type: string, payload: unknown): void {
    void this._view?.webview.postMessage({ type, ...payload as object });
  }

  private _log(text: string): void { this._post('log', { text }); }
  private _error(text: string): void { this._post('error', { text }); }
  private _setLoading(loading: boolean): void { this._post('loading', { loading }); }

  private _updateBadge(): void {
    if (!this._view || !this._dataLoaded) { return; }
    const count = this._lastErrors.filter((e: any) => e.active).length;
    this._view.title = count > 0 ? `Build Monitor (${count})` : 'Build Monitor';
    if (this._buildRunning && count === 0) {
      this._view.badge = { value: 1, tooltip: 'CI run in progress…' };
    } else if (count > 0) {
      const prefix = this._buildRunning ? 'Running · ' : '';
      this._view.badge = { value: count, tooltip: prefix + count + ' error(s) need attention' };
    } else {
      this._view.badge = undefined;
    }
  }

  // Publish active errors as VS Code diagnostics so any AI tool that reads the
  // Problems panel (Copilot Chat, Claude Code, Cursor, etc.) can see and fix them.
  private _publishDiagnostics(repoRoot: string): void {
    this._diagnostics.clear();
    const byFile = new Map<string, vscode.Diagnostic[]>();
    for (const err of this._lastErrors) {
      if (!err.active) { continue; }
      const absPath = path.join(repoRoot, err.filepath);
      const uri = vscode.Uri.file(absPath);
      const line = Math.max(0, parseInt(err.lineno) - 1);
      const range = new vscode.Range(line, 0, line, 999);
      const diag = new vscode.Diagnostic(
        range,
        `[${err.rule}] ${err.reason}`,
        vscode.DiagnosticSeverity.Warning
      );
      diag.source = err.source === 'local' ? 'exl-local' : 'exl-ci';
      diag.code = err.rule;
      const list = byFile.get(uri.toString()) ?? [];
      list.push(diag);
      byFile.set(uri.toString(), list);
    }
    for (const [uriStr, diags] of byFile) {
      this._diagnostics.set(vscode.Uri.parse(uriStr), diags);
    }
  }

  // ── Config / auth ──────────────────────────────────────────────────────────

  private async _loadConfig(): Promise<GhecConfig | null> {
    const token = getGhToken();
    if (!token) {
      output.appendLine('[GHEC] gh auth token returned nothing — run "gh auth login".');
      this._post('banner', { text: 'Logged out. Run "gh auth login" then click ↻.' });
      return null;
    }

    try {
      this._config = buildConfig(token, this._cwd);
    } catch (e: any) {
      output.appendLine(`[GHEC] buildConfig failed: ${e.message}`);
      this._post('banner', { text: e.message });
      return null;
    }
    output.appendLine(`[GHEC] Config: ${this._config.owner}/${this._config.repo}, branch=${this._config.currentBranch}`);
    return this._config;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  private async _handleRefresh(): Promise<void> {
    this._setLoading(true);
    try {
      const cfg = await this._loadConfig();
      if (!cfg) { return; }

      const ok = await testConnectivity(cfg);
      if (!ok) {
        this._post('banner', { text: `Cannot reach ${cfg.apiBase} — check your network. Click ↻ to retry.` });
        return;
      }
      this._post('banner', { text: '' });

      const runs = await getWorkflowRuns(cfg, 5);

      const latestRun = runs[0] ?? null;
      const summary = latestRun?.result === 'FAILURE'
        ? await getRunErrors(cfg, Number(latestRun.id), cfg.repoRoot)
        : null;

      this._lastErrors = summary?.errors ?? [];
      this._lastRunId = latestRun ? Number(latestRun.id) : 0;
      this._dataLoaded = true;
      this._updateBadge();
      this._publishDiagnostics(cfg.repoRoot);

      const uncommittedFiles = getUncommittedFiles(cfg.repoRoot);

      // Run local markdownlint + cspell on uncommitted .md files
      const localErrors = uncommittedFiles.length > 0
        ? runLocalLint(cfg.repoRoot, this._context.extensionPath, uncommittedFiles)
        : [];

      // Compute proposed fixes for local errors (CI errors get fixes in parseLogErrors)
      for (const err of localErrors) {
        if (err.active && !err.proposedFix) {
          err.proposedFix = computeProposedFix(
            cfg.repoRoot, err.filepath, err.lineno, err.target,
            err.fixStatus, err.fixCandidates, err.rule, err.reason
          );
        }
      }

      // Merge local errors into summary so they appear in the same error list
      const mergedSummary = summary
        ? { ...summary, errors: [...localErrors, ...summary.errors] }
        : localErrors.length > 0
          ? { runId: 0, errors: localErrors, unparsed: [] }
          : null;

      this._post('statusData', {
        repo: `${cfg.owner}/${cfg.repo}`,
        branch: cfg.currentBranch,
        runs,
        summary: mergedSummary,
        uncommittedCount: uncommittedFiles.length,
      });
      output.appendLine(`[GHEC] statusData posted: runs=${runs.length}, errors=${this._lastErrors.length}, local=${localErrors.length}`);
    } catch (e: any) {
      output.appendLine(`[GHEC] Refresh error: ${e.message}`);
      this._post('banner', { text: `Refresh failed: ${e.message}` });
    } finally {
      this._setLoading(false);
    }
  }

  private async _handlePushCheck(): Promise<void> {
    const cfg = await this._loadConfig();
    if (!cfg) { return; }

    this._post('switchTab', { tab: 'build' });

    let status;
    try {
      status = getStatus(this._cwd);
    } catch (e: any) {
      this._error(`Git error: ${e.message}`); return;
    }

    const uncommitted = getUncommittedFiles(cfg.repoRoot);
    if (uncommitted.length > 0) {
      const label = uncommitted.length === 1 ? '1 uncommitted file' : `${uncommitted.length} uncommitted files`;
      const choice = await vscode.window.showWarningMessage(
        `You have ${label}. Commit before pushing?`,
        'Commit & Push', 'Push Anyway', 'Cancel'
      );
      if (choice === 'Commit & Push') { await this._handleCommitAndPush(); return; }
      if (choice !== 'Push Anyway') { return; }
    }

    this._log(`Pushing ${status.branch} to origin…`);
    let sha: string;
    try {
      sha = pushCurrentBranch(this._cwd);
    } catch (e: any) {
      this._error(`Push failed: ${e.message}`); return;
    }
    this._log(`Pushed ${sha.slice(0, 7)}.`);

    // CI only runs on PR events — check for an open PR
    let pr = await getOpenPr(cfg, status.branch);
    if (!pr) {
      const choice = await vscode.window.showInformationMessage(
        `No open PR for "${status.branch}". Create one to trigger CI?`,
        'Create PR', 'Cancel'
      );
      if (choice !== 'Create PR') {
        this._log('No PR — CI will not run until a PR is opened.'); return;
      }
      const title = status.branch.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      pr = await createPr(cfg, status.branch, title);
      if (!pr) {
        this._error('Failed to create PR. Check permissions or create it manually on GitHub.'); return;
      }
      this._log(`PR #${pr.number} created.`);
      void vscode.env.openExternal(vscode.Uri.parse(pr.url));
    } else {
      this._log(`Found PR #${pr.number}: ${pr.title}`);
    }

    this._log('Waiting for CI run to start…');
    await this._monitorBySha(cfg, sha);
  }


  private async _monitorBySha(cfg: GhecConfig, sha: string): Promise<void> {
    let runId: number | null = null;
    for (let i = 0; i < 18 && !runId; i++) {
      await sleep(10000);
      runId = await findRunBySha(cfg, sha);
    }
    if (!runId) {
      this._error('No CI run detected after 3 minutes. Check GitHub Actions manually.');
      return;
    }
    await this._monitorRunId(cfg, runId);
  }

  private async _monitorRunId(cfg: GhecConfig, runId: number): Promise<void> {
    this._log(`Run #${runId} started. Monitoring…`);
    this._post('buildStarted', { buildNum: runId });
    this._buildRunning = true;
    this._updateBadge();

    // Estimate duration from recent history
    const history = await getWorkflowRuns(cfg, 5);
    const completed = history.filter(r => r.result && r.result !== 'CANCELLED' && r.durationInMillis);
    const avgMs = completed.length
      ? completed.reduce((s, r) => s + r.durationInMillis!, 0) / completed.length
      : 120000;
    const estSecs = Math.round(avgMs / 1000);

    for (let i = 0; i < 120; i++) {
      await sleep(10000);
      const info = await pollRun(cfg, runId);
      const elapsed = Math.floor(Date.now() / 1000) - info.startedAt;
      const eta = Math.max(0, estSecs - elapsed);
      const etaStr = eta > 0 ? `ETA ~${Math.floor(eta / 60)}m ${eta % 60}s` : 'finishing…';

      this._post('buildProgress', { buildNum: runId, elapsed, estSecs, etaStr, building: info.inProgress });

      if (!info.inProgress) {
        const result = (info.conclusion ?? 'unknown').toUpperCase();
        this._log(`Run #${runId} ${result}`);
        this._post('buildDone', { buildNum: runId, result: result === 'SUCCESS' ? 'SUCCESS' : 'FAILURE' });
        this._buildRunning = false;
        this._updateBadge();
        await this._handleRefresh();
        return;
      }
    }
    this._buildRunning = false;
    this._updateBadge();
    this._error('Run timed out after 20 minutes.');
  }

  private async _handleAutoFix(): Promise<void> {
    const cfg = await this._loadConfig();
    if (!cfg) { return; }

    this._post('switchTab', { tab: 'build' });

    const MAX_ITER = 5;
    for (let iter = 1; iter <= MAX_ITER; iter++) {
      this._log(`\n── Auto-fix iteration ${iter}/${MAX_ITER} ──`);

      // On the first pass, work from already-loaded errors instead of triggering
      // a new build. Subsequent passes push and wait for fresh CI results.
      let summary: BuildSummary | null = null;
      if (iter === 1 && this._lastErrors.some(e => e.active)) {
        this._log('Using errors from last refresh…');
        summary = { runId: this._lastRunId, errors: this._lastErrors, unparsed: [] };
      } else {
        await this._handlePushCheck();

        const { lastFailed, lastSuccess } = await getLastRuns(cfg);
        if (!lastFailed || lastFailed <= lastSuccess) {
          this._log('CI passed — no errors to fix.');
          return;
        }

        summary = await getRunErrors(cfg, lastFailed, cfg.repoRoot);
        if (!summary) { this._error('Could not retrieve run errors.'); return; }
      }

      const fixable = summary.errors.filter(e =>
        e.active && (e.fixStatus === 'path-fix' || e.fixStatus === 'delink' || !!e.proposedFix)
      );
      if (fixable.length === 0) {
        if (summary.errors.filter(e => e.active).length > 0) {
          this._error('No auto-fixable errors remain. Manual action required.');
        } else {
          this._log('All errors resolved.');
        }
        return;
      }

      this._log(`Applying ${fixable.length} fix(es)…`);
      const fixed: string[] = [];
      const unfixable: string[] = [];

      for (const err of fixable) {
        const absFilePath = path.resolve(cfg.repoRoot, err.filepath);
        let applied = false;

        if (err.fixStatus === 'path-fix') {
          const candidate = err.fixCandidates?.[0];
          if (!candidate) { unfixable.push(`${err.filepath}:${err.lineno} (no candidate)`); continue; }
          applied = applyPathFix(absFilePath, parseInt(err.lineno), err.target, path.resolve(cfg.repoRoot, candidate));
          if (applied) { fixed.push(`${err.filepath}:${err.lineno} → ${candidate}`); }
        } else if (err.fixStatus === 'delink') {
          applied = delinkAtLine(absFilePath, parseInt(err.lineno), err.target);
          if (applied) { fixed.push(`${err.filepath}:${err.lineno} (de-linked)`); }
        } else if (err.proposedFix) {
          const fixLine = err.proposedFix.fixLine ?? parseInt(err.lineno);
          applied = applyLineFix(absFilePath, fixLine, err.proposedFix.before, err.proposedFix.after);
          if (applied) { fixed.push(`${err.filepath}:${err.lineno} (${err.rule})`); }
        }

        if (!applied) { unfixable.push(`${err.filepath}:${err.lineno} (pattern not matched)`); }
      }

      if (fixed.length === 0) {
        this._error('No fixes could be applied. Manual intervention needed.');
        return;
      }

      fixed.forEach(f => this._log(`  Fixed: ${f}`));
      if (unfixable.length) { unfixable.forEach(u => this._log(`  Skipped: ${u}`)); }

      const msg = `fix: correct broken references (attempt ${iter}) — ${fixed.length} fixed`;
      try {
        commitFixes(this._cwd, msg);
        this._log(`Committed: ${msg}`);
      } catch (e: any) {
        this._error(`Commit failed: ${e.message}`); return;
      }
    }

    this._error(`Could not fix CI after ${MAX_ITER} attempts. Manual intervention needed.`);
  }

  private async _handleApplyOneFix(
    action: string, filepath: string, lineno: number, candidate: string, target: string
  ): Promise<void> {
    const cfg = await this._loadConfig();
    if (!cfg) { return; }
    const absFile = path.join(cfg.repoRoot, filepath);
    try {
      let ok = false;
      let failReason = 'unknown';
      const err = this._lastErrors.find((e: BuildError) => e.filepath === filepath && e.lineno === String(lineno));

      if (action === 'path-fix' && candidate) {
        ok = applyPathFix(absFile, lineno, err?.target || target, path.join(cfg.repoRoot, candidate));
        if (!ok) { failReason = `path-fix regex did not match in ${filepath}:${lineno} for target "${err?.target || target}"`; }
      } else if (action === 'delink') {
        ok = delinkAtLine(absFile, lineno, target);
        if (!ok) { failReason = `delink regex did not match in ${filepath}:${lineno} for target "${target}"`; }
      } else if (action === 'markdown-fix') {
        if (!err) {
          failReason = `error not found in _lastErrors for ${filepath}:${lineno}`;
        } else if (!err.proposedFix) {
          failReason = `no proposedFix on error (rule=${err.rule})`;
        } else {
          const fixLine = err.proposedFix.fixLine ?? lineno;
          ok = applyLineFix(absFile, fixLine, err.proposedFix.before, err.proposedFix.after);
          if (!ok) { failReason = `line content mismatch at ${filepath}:${fixLine} — expected "${err.proposedFix.before}"`; }
        }
      } else {
        failReason = `unknown action "${action}"`;
      }

      if (ok) {
        if (err) { err.active = false; }
        this._updateBadge();
        this._post('fixApplied', { filepath, lineno });
      } else {
        output.appendLine(`[GHEC] applyOneFix failed: ${failReason}`);
        this._post('banner', { text: `Could not apply fix: ${failReason}` });
      }
    } catch (e: any) {
      this._post('banner', { text: `Fix error: ${e.message}` });
    }
  }

  private async _handleCommitAndPush(): Promise<void> {
    const cfg = await this._loadConfig();
    if (!cfg) { return; }
    try {
      const activeErrors = this._lastErrors.filter((e: any) => e.active);
      const files = [...new Set(activeErrors.map((e: any) => e.filepath))];
      const msg = files.length === 1
        ? `fix: repair broken link in ${files[0]}`
        : `fix: repair ${activeErrors.length} broken link(s)`;
      commitAndPush(cfg.repoRoot, msg);
      this._post('commitDone', {});
      await this._handlePushCheck();
    } catch (e: any) {
      this._post('banner', { text: `Commit/push failed: ${e.message}` });
    }
  }

  private async _handleApplyFixes(): Promise<void> {
    const cfg = await this._loadConfig();
    if (!cfg) { return; }

    if (!this._lastErrors.length) {
      this._error('No errors loaded — refresh first.');
      return;
    }

    this._post('switchTab', { tab: 'build' });

    const claudeKey = await this._context.secrets.get(ANTHROPIC_KEY_SECRET);
    const openAiKey = await this._context.secrets.get(OPENAI_KEY_SECRET);
    const claude = buildClaudeClient(claudeKey, openAiKey);
    const aiLabel = claudeKey ? 'Claude (Anthropic)' : openAiKey ? 'OpenAI' : 'claude CLI';
    this._log(`Using ${aiLabel}`);

    const repairContext = loadRepairContext(this._context.extensionPath);

    const active = this._lastErrors.filter((e: any) => e.active);
    if (active.length === 0) {
      this._log('All errors already fixed locally.'); return;
    }

    // Group by file
    const byFile = new Map<string, { errors: any[]; lines: string[] }>();
    for (const e of active) {
      if (!e.filepath) { continue; }
      if (!byFile.has(e.filepath)) {
        const absFile = path.join(cfg.repoRoot, e.filepath.replace(/^\//, ''));
        let lines: string[];
        try { lines = fs.readFileSync(absFile, 'utf8').split('\n'); } catch {
          this._log(`  ⚠ Cannot read ${e.filepath} — skipped`);
          continue;
        }
        byFile.set(e.filepath, { errors: [], lines });
      }
      byFile.get(e.filepath)!.errors.push(e);
    }

    if (byFile.size === 0) {
      this._log('No readable files to fix.'); return;
    }

    const CONTEXT = 4;
    let filesSection = '';
    for (const [relFile, entry] of byFile) {
      const { lines } = entry;
      const windows: Array<{ lo: number; hi: number }> = [];
      for (const e of entry.errors) {
        const n = parseInt(e.lineno) - 1;
        if (!isNaN(n)) { windows.push({ lo: Math.max(0, n - CONTEXT), hi: Math.min(lines.length - 1, n + CONTEXT) }); }
      }

      let snippet: string;
      if (windows.length === 0) {
        snippet = lines.slice(0, 30).map((l: string, i: number) => `${i + 1}: ${l}`).join('\n');
      } else {
        windows.sort((a, b) => a.lo - b.lo);
        const merged: Array<{ lo: number; hi: number }> = [];
        for (const w of windows) {
          if (merged.length && w.lo <= merged[merged.length - 1].hi + 1) {
            merged[merged.length - 1].hi = Math.max(merged[merged.length - 1].hi, w.hi);
          } else { merged.push({ ...w }); }
        }
        snippet = merged.map(w =>
          lines.slice(w.lo, w.hi + 1).map((l: string, i: number) => `${w.lo + i + 1}: ${l}`).join('\n')
        ).join('\n…\n');
      }

      const errorSummary = entry.errors.map((e: any) =>
        `  line ${e.lineno}: ${e.rule} — ${e.reason}`
      ).join('\n');

      filesSection += `\n---\nFile: ${relFile}\nIssues:\n${errorSummary}\n\nRelevant lines:\n\`\`\`markdown\n${snippet}\n\`\`\`\n`;
    }

    const userPrompt =
      `Repository: ${cfg.owner}/${cfg.repo}\n` +
      `Markdownlint CI found issues in ${byFile.size} file(s). ` +
      `For each issue, output one NDJSON action per line including the "file" field:\n` +
      `{"action":"fix","file":"<repo-relative path>","find":"<exact text>","replace":"<replacement>"}\n` +
      `{"action":"skip","file":"<repo-relative path>","reason":"<why no fix>"}\n` +
      `{"action":"note","file":"<repo-relative path>","text":"<observation>"}\n\n` +
      `Rules:\n` +
      `- "find" must be the exact string as it appears in the file (no line-number prefix)\n` +
      `- AM046 (missing linked file): if the target filename is just misspelled or in a different folder, fix the path; otherwise remove the link keeping its text\n` +
      `- MD051 (broken anchor): fix the anchor to match an existing heading, or remove it\n` +
      `- Other rules: apply the minimal fix that resolves the markdownlint violation\n` +
      `- Do not change unrelated content — output only NDJSON lines, no prose\n` +
      filesSection;

    const systemPrompt = repairContext ||
      `You are an Adobe Experience League documentation repair tool. ` +
      `You fix markdownlint errors in EXL Markdown files. Output only NDJSON — one JSON object per line.`;

    const fileContents = new Map(Array.from(byFile.entries()).map(([k, v]) => [k, v.lines.join('\n')]));
    const fileChanged = new Set<string>();
    let lineBuffer = '';
    let rawResponse = '';
    let aiError: string | null = null;
    let firstChunk = true;
    let actionCount = 0;

    this._log(`Sending ${byFile.size} file(s) to AI…`);
    this._post('fixFilesStarting', { files: Array.from(byFile.keys()).map(f => f.replace(/^\//, '')) });

    const slowTimer = setTimeout(() => {
      if (firstChunk) { this._log('Still waiting for response…'); }
    }, 15000);

    try {
      await claude.query(systemPrompt, userPrompt, (chunk) => {
        if (firstChunk) { firstChunk = false; clearTimeout(slowTimer); this._log('Response streaming…'); }
        lineBuffer += chunk;
        rawResponse += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { continue; }
          try {
            const action = JSON.parse(trimmed);
            const file: string = action.file ?? '';
            if (!fileContents.has(file)) { continue; }
            let content = fileContents.get(file)!;
            actionCount++;

            if (action.action === 'fix' && action.find && action.replace !== undefined) {
              if (content.includes(action.find)) {
                content = content.split(action.find).join(action.replace);
                fileContents.set(file, content);
                fileChanged.add(file);
                this._post('actionResult', { file: file.replace(/^\//, ''), type: 'fix', find: action.find?.slice(0, 80) });
              } else {
                this._post('actionResult', { file: file.replace(/^\//, ''), type: 'notfound', find: action.find?.slice(0, 80) });
              }
            } else if (action.action === 'skip') {
              this._post('actionResult', { file: file.replace(/^\//, ''), type: 'skip', reason: action.reason });
            } else if (action.action === 'note') {
              this._post('actionResult', { file: file.replace(/^\//, ''), type: 'note', reason: action.text });
            }
          } catch { /* incomplete JSON */ }
        }
      });
    } catch (e: any) {
      aiError = e.message;
      this._error(`AI error: ${e.message}`);
    } finally {
      clearTimeout(slowTimer);
    }

    if (!aiError && actionCount === 0) {
      output.appendLine('[ApplyFixes] Raw AI response:\n' + rawResponse.slice(0, 2000));
      this._log('No actions returned — response may not be valid NDJSON.');
    }

    let totalChanged = 0, totalFailed = 0;
    for (const relFile of fileChanged) {
      const absFile = path.join(cfg.repoRoot, relFile.replace(/^\//, ''));
      const relCheck = path.relative(cfg.repoRoot, absFile);
      if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
        this._error(`Skipped unsafe path: ${relFile}`);
        totalFailed++;
        continue;
      }
      try {
        fs.writeFileSync(absFile, fileContents.get(relFile)!, 'utf8');
        totalChanged++;
      } catch (e: any) {
        this._error(`Write failed for ${relFile}: ${e.message}`);
        totalFailed++;
      }
    }

    this._post('fixDone', { changed: Array.from(fileChanged).map(f => f.replace(/^\//, '')) });
    const parts: string[] = [];
    if (totalChanged > 0) { parts.push(`${totalChanged} file(s) changed`); }
    if (totalFailed > 0) { parts.push(`${totalFailed} write error(s)`); }
    if (aiError) { parts.push('AI error — partial results only'); }
    this._log(parts.length ? parts.join(' · ') : 'No changes needed.');
    if (totalChanged > 0) { this._log('Review with git diff before committing.'); }
  }

  private async _openFile(filepath: string, line?: number): Promise<void> {
    const base = this._config?.repoRoot ?? this._cwd;
    const absPath = path.join(base, filepath.replace(/^\//, ''));
    try {
      const uri = vscode.Uri.file(absPath);
      const opts: vscode.TextDocumentShowOptions = line
        ? { selection: new vscode.Range(line - 1, 0, line - 1, 0) }
        : {};
      await vscode.window.showTextDocument(uri, opts);
    } catch (e: any) {
      void vscode.window.showErrorMessage(`Could not open file: ${absPath}\n${e.message}`);
    }
  }

  // ── HTML ──────────────────────────────────────────────────────────────────

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'panel.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'ghec-build-panel.css')
    );
    const csp = webview.cspSource;
    // Webview CSP: script only from extension (no inline handlers); style allows inline attributes
    // on static markup. Same model works in VS Code and Cursor (shared webview/Electron stack).
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline'; img-src ${csp} data:; font-src ${csp}; script-src ${csp};">
<link rel="stylesheet" href="${styleUri}">
</head>
<body>

<!-- ── Main UI ────────────────────────────────────────────────────────────── -->
<div id="mainPanel" class="exl-root">

<header class="exl-hero">
  <div class="exl-hero-inner">
    <div class="exl-eyebrow">Validate · fix · ship</div>
    <h1 class="exl-title">Build monitor</h1>
    <p class="exl-repo" id="repoInfo">Loading…</p>
  </div>
</header>

<div class="exl-main">
<div id="bannerError" class="sp-banner"></div>

<div class="sp-tabs">
  <button type="button" class="sp-tab active" data-tab="status">Status</button>
  <button type="button" class="sp-tab" data-tab="build">Build</button>
</div>

<!-- ── Status Tab ─────────────────────────────────────────────────────────── -->
<div class="tab-panel active" id="tab-status">
  <div class="sp-section">
    <div class="sp-section-heading">Recent runs</div>
    <div id="buildHistory"><span class="sp-empty">Loading…</span></div>
  </div>
</div>

<!-- ── Build Tab ──────────────────────────────────────────────────────────── -->
<div class="tab-panel" id="tab-build">

  <div class="pipeline-step" style="margin-bottom:4px">
    <div class="pipeline-icon">⎇</div>
    <div class="pipeline-body">
      <div class="pipeline-label">Branch</div>
      <div class="pipeline-desc" id="pipelineBranch">—</div>
    </div>
  </div>

  <div class="pipeline-step-actions">
    <div class="action-row">
      <button type="button" class="btn" data-exl-action="pushCheck">⬆ Push &amp; Check</button>
      <button type="button" class="btn btn-secondary" data-exl-action="autoFix">⚙ Auto Fix</button>
    </div>
    <div class="pipeline-desc"><b>Push &amp; Check</b> — push branch, monitor CI run, show errors.</div>
    <div class="pipeline-desc"><b>Auto Fix</b> — iterate: push → AI fix → commit until green.</div>
  </div>

  <div class="pipeline-step" style="margin-bottom:4px">
    <div class="pipeline-icon" id="reviewBuildIcon">○</div>
    <div class="pipeline-body">
      <div class="pipeline-label">validate-articles</div>
      <div class="pipeline-desc" id="pipelineReviewStatus">—</div>
    </div>
  </div>

  <div id="progressWrap" style="display:none;margin-bottom:6px">
    <div class="eta-row" id="etaRow"></div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
  </div>

  <div class="log-panel" id="buildLog"></div>

  <div id="fixCards" style="display:none;margin-top:8px"></div>
</div>

<!-- ── Errors (always visible) ───────────────────────────────────────────── -->
<div class="sp-section" id="errorsSection">
  <div class="sp-section-heading" id="errorsHeading">Errors</div>
  <div id="errorList"><span class="sp-empty">No errors.</span></div>
  <div id="commitBar" class="commit-bar" style="display:none">
    <span id="commitBarLabel">0 fix(es) ready</span>
    <button type="button" class="btn btn-primary btn-sm" data-exl-action="commitAndPush">Commit &amp; push ↑</button>
  </div>
</div>

</div><!-- exl-main -->

</div><!-- /mainPanel -->
<script src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
