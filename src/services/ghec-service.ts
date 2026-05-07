import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GhecConfig } from './ghec-config';

export interface BuildRun {
  id: string;
  runNumber: number;
  result: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'SKIPPED' | 'RUNNING' | 'QUEUED' | null;
  state: string;
  startTime: string | null;
  durationInMillis: number | null;
  headBranch: string;
  headSha: string;
  htmlUrl: string;
}

export interface BuildError {
  filepath: string;
  lineno: string;
  rule: string;
  reason: string;
  target: string;   // extracted asset/file path from the error message, if any
  active: boolean;
  fixStatus: 'path-fix' | 'delink' | 'ambiguous' | 'unknown';
  fixCandidates?: string[];
  diffHunk?: string[];  // relevant diff lines from git diff origin/main, if available
  proposedFix?: { before: string; after: string; fixLine?: number };
  source?: 'ci' | 'local';
}

export interface BuildSummary {
  runId: number;
  errors: BuildError[];
  unparsed: Array<{ line: string }>;
}

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'adobe-exl-vscode-extension',
});

function httpsGet(url: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: GH_HEADERS(token),
      timeout: 20000,
    }, (res) => {
      // GitHub log endpoints redirect to a CDN — follow without auth header
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (!location) { reject(new Error('Redirect with no location')); return; }
        const redir = https.get(location, { timeout: 30000 }, (res2) => {
          const chunks: Uint8Array[] = [];
          res2.on('data', (c) => chunks.push(c));
          res2.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        redir.on('error', reject);
        redir.on('timeout', () => { redir.destroy(); reject(new Error('Redirect timed out')); });
        return;
      }
      const chunks: Uint8Array[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function httpsPostJson(url: string, token: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { ...GH_HEADERS(token), 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 15000,
    }, (res) => {
      let raw = '';
      res.on('data', (c: Buffer) => { raw += c.toString(); });
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(data);
    req.end();
  });
}

function mapResult(status: string, conclusion: string | null): BuildRun['result'] {
  if (status === 'queued') { return 'QUEUED'; }
  if (status === 'in_progress') { return 'RUNNING'; }
  switch (conclusion) {
    case 'success': return 'SUCCESS';
    case 'failure': return 'FAILURE';
    case 'cancelled': return 'CANCELLED';
    case 'skipped': return 'SKIPPED';
    default: return null;
  }
}

function mapRun(r: any): BuildRun {
  const created = r.created_at ? new Date(r.created_at).getTime() : 0;
  const updated = r.updated_at ? new Date(r.updated_at).getTime() : 0;
  const durationMs = r.status === 'completed' && created ? updated - created : null;
  return {
    id: String(r.id),
    runNumber: r.run_number,
    result: mapResult(r.status, r.conclusion),
    state: r.status,
    startTime: r.created_at ?? null,
    durationInMillis: durationMs,
    headBranch: r.head_branch ?? '',
    headSha: r.head_sha ?? '',
    htmlUrl: r.html_url ?? '',
  };
}

export async function testConnectivity(config: GhecConfig): Promise<boolean> {
  try {
    const url = `${config.apiBase}/repos/${config.owner}/${config.repo}`;
    const body = await httpsGet(url, config.token);
    const data = JSON.parse(body);
    return !!data.id;
  } catch {
    return false;
  }
}

export async function getWorkflowRuns(config: GhecConfig, perPage = 10): Promise<BuildRun[]> {
  const url = `${config.apiBase}/repos/${config.owner}/${config.repo}/actions/runs?per_page=${perPage}`;
  const body = await httpsGet(url, config.token);
  try { return (JSON.parse(body).workflow_runs || []).map(mapRun); } catch { return []; }
}

export async function getLastRuns(config: GhecConfig): Promise<{ lastFailed: number; lastSuccess: number }> {
  const url = `${config.apiBase}/repos/${config.owner}/${config.repo}/actions/runs?per_page=20`;
  const body = await httpsGet(url, config.token);
  let lastFailed = 0, lastSuccess = 0;
  try {
    for (const r of (JSON.parse(body).workflow_runs || [])) {
      if (r.status !== 'completed') { continue; }
      if (r.conclusion === 'failure' && !lastFailed) { lastFailed = r.id; }
      if (r.conclusion === 'success' && !lastSuccess) { lastSuccess = r.id; }
      if (lastFailed && lastSuccess) { break; }
    }
  } catch { /* return zeros */ }
  return { lastFailed, lastSuccess };
}

export async function pollRun(config: GhecConfig, runId: number): Promise<{
  inProgress: boolean;
  conclusion: string | null;
  startedAt: number;
  estimatedMs: number;
}> {
  const url = `${config.apiBase}/repos/${config.owner}/${config.repo}/actions/runs/${runId}`;
  let r: any;
  try { r = JSON.parse(await httpsGet(url, config.token)); } catch { r = {}; }
  const created = r.created_at ? new Date(r.created_at).getTime() : Date.now();
  const updated = r.updated_at ? new Date(r.updated_at).getTime() : 0;
  const estimatedMs = r.status === 'completed' && updated ? updated - created : 0;
  return {
    inProgress: r.status !== 'completed',
    conclusion: r.conclusion ?? null,
    startedAt: Math.floor(created / 1000),
    estimatedMs,
  };
}

export async function findRunBySha(config: GhecConfig, sha: string): Promise<number | null> {
  const url = `${config.apiBase}/repos/${config.owner}/${config.repo}/actions/runs?head_sha=${sha}&per_page=5`;
  try {
    const runs: any[] = JSON.parse(await httpsGet(url, config.token)).workflow_runs || [];
    return runs.length > 0 ? runs[0].id : null;
  } catch { return null; }
}

export async function getOpenPr(config: GhecConfig, branch: string): Promise<{ number: number; url: string; title: string } | null> {
  const url = `${config.apiBase}/repos/${config.owner}/${config.repo}/pulls?head=${encodeURIComponent(config.owner + ':' + branch)}&state=open&per_page=1`;
  try {
    const prs = JSON.parse(await httpsGet(url, config.token));
    if (!Array.isArray(prs) || prs.length === 0) { return null; }
    return { number: prs[0].number, url: prs[0].html_url, title: prs[0].title };
  } catch { return null; }
}

export async function createPr(config: GhecConfig, branch: string, title: string): Promise<{ number: number; url: string; title: string } | null> {
  const url = `${config.apiBase}/repos/${config.owner}/${config.repo}/pulls`;
  const result = await httpsPostJson(url, config.token, { title, head: branch, base: 'main', draft: false });
  if (!result?.number) { return null; }
  return { number: result.number, url: result.html_url, title: result.title ?? title };
}

// ── Log parsing ──────────────────────────────────────────────────────────────

const TIMESTAMP_PREFIX = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s+/;
const CONTENT_PREFIX = /^(?:main|content)\//;
// Matches: {file}:{line} {RULE/alias} {message}
const ERROR_LINE = /^(.+?):(\d+)\s+([A-Z]+\d+(?:\/[a-z0-9-]+)*)\s+([\s\S]+)$/;

function extractTarget(rule: string, reason: string): string {
  // AM046: "[Linked file does not exist: path/file.png]"
  if (rule.startsWith('AM046') || rule.includes('missing-linked-file')) {
    const m = reason.match(/\[Linked file does not exist:\s*([^\]]+)\]/);
    if (m) { return m[1].trim(); }
  }
  // MD051: "[Link: #anchor]"
  if (rule.startsWith('MD051') || rule.includes('link-fragments')) {
    const m = reason.match(/\[Link:\s*([^\]]+)\]/);
    if (m) { return m[1].trim(); }
  }
  return '';
}

function errorStillActive(filepath: string, lineno: number, target: string, _repoRoot: string, _filePath: string): boolean {
  try {
    const lines = fs.readFileSync(filepath, 'utf8').split('\n');
    const lo = Math.max(0, lineno - 3);
    const hi = Math.min(lines.length, lineno + 2);
    const chunk = lines.slice(lo, hi).join('\n');
    if (!target) { return true; }
    const basename = path.basename(target);
    if (!chunk.includes(basename)) { return false; }
    return true;
  } catch {
    return false;
  }
}

function extractLinks(line: string): string[] {
  const out: string[] = [];
  const re = /\]\(([^)#]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) { const t = m[1].trim(); if (t) { out.push(t); } }
  return out;
}

function resolveExisting(repoRoot: string, fileDir: string, t: string): string | null {
  const absRel = path.resolve(repoRoot, fileDir, t);
  if (fs.existsSync(absRel)) { return absRel.replace(repoRoot + path.sep, '').replace(/\\/g, '/'); }
  const absRoot = path.resolve(repoRoot, t);
  if (fs.existsSync(absRoot)) { return t; }
  return null;
}

/**
 * Looks at `git diff origin/main -- filePath` to find the original path that was
 * replaced by the broken target in this branch. Returns both the fix candidates and
 * the relevant hunk lines (context + the -/+ pair) for display in the panel.
 */
function gitDiffCandidates(repoRoot: string, filePath: string, target: string): {
  candidates: string[];
  hunk: string[];
} {
  const fileDir = path.dirname(filePath);
  const brokenBase = path.basename(target);
  const empty = { candidates: [], hunk: [] };

  for (const ref of ['origin/main', 'main']) {
    try {
      const diff = execSync(
        `git diff ${ref} -- "${filePath}"`,
        { cwd: repoRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      if (!diff.trim()) { continue; }

      const lines = diff.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!l.startsWith('+') || l.startsWith('+++')) { continue; }
        if (!l.includes(brokenBase)) { continue; }

        // Walk backwards to find the @@ header and the paired - line
        let hunkStart = i;
        let removedLine = -1;
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].startsWith('@@')) { hunkStart = j; break; }
          if (lines[j].startsWith('-') && !lines[j].startsWith('---')) { removedLine = j; }
        }

        // Collect context: @@ header + a window of context/change lines around the pair
        const from = Math.max(hunkStart, Math.min(removedLine < 0 ? i : removedLine, i) - 3);
        const to   = Math.min(lines.length - 1, i + 2);
        const hunk = lines.slice(from, to + 1).filter(ln => ln !== '');

        if (removedLine < 0) { return { candidates: [], hunk }; }

        const candidates = extractLinks(lines[removedLine].slice(1))
          .map(t => resolveExisting(repoRoot, fileDir, t))
          .filter((t): t is string => t !== null);
        return { candidates, hunk };
      }
      return empty;
    } catch { continue; }
  }
  return empty;
}

export function evaluateFix(repoRoot: string, target: string, filePath?: string): {
  fixStatus: BuildError['fixStatus'];
  fixCandidates?: string[];
  diffHunk?: string[];
} {
  const clean = target.split('#')[0].trim().replace(/^<|>$/g, '').replace(/\/+$/, '');
  if (!clean) { return { fixStatus: 'unknown' }; }

  const parts = clean.split('/').filter(p => p && p !== '.');
  let matches: string[] = [];

  for (let i = 0; i < parts.length && matches.length === 0; i++) {
    const suffix = parts.slice(i).join('/');
    const ext = path.extname(suffix);
    const candidates = ext ? [suffix] : [suffix, suffix + '.md'];

    for (const s of candidates) {
      try {
        const result = execSync(
          `find . -path '*/${s}' -not -path '*/.git/*'`,
          { cwd: repoRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        matches = result ? result.split('\n').filter(Boolean) : [];
      } catch {
        matches = [];
      }
      if (matches.length > 0) { break; }
    }
  }

  // Exact match failed — check what this PR changed to find the original path
  if (matches.length === 0 && filePath) {
    const { candidates: dc, hunk } = gitDiffCandidates(repoRoot, filePath, target);
    if (dc.length === 1) { return { fixStatus: 'path-fix', fixCandidates: dc, diffHunk: hunk }; }
    if (dc.length > 1)  { return { fixStatus: 'ambiguous', fixCandidates: dc.slice(0, 3), diffHunk: hunk }; }
    if (hunk.length > 0) { return { fixStatus: 'delink', diffHunk: hunk }; }
  }

  if (matches.length === 0) { return { fixStatus: 'delink' }; }
  if (matches.length === 1) { return { fixStatus: 'path-fix', fixCandidates: matches }; }
  return { fixStatus: 'ambiguous', fixCandidates: matches.slice(0, 3) };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeProposedFix(
  repoRoot: string,
  filePath: string,
  lineno: string,
  target: string,
  fixStatus: BuildError['fixStatus'],
  fixCandidates?: string[],
  rule?: string,
  reason?: string
): { before: string; after: string; fixLine?: number } | undefined {
  try {
    const absPath = path.join(repoRoot, filePath);
    const lines = fs.readFileSync(absPath, 'utf8').split('\n');
    const idx = parseInt(lineno) - 1;
    if (idx < 0 || idx >= lines.length) { return undefined; }
    const before = lines[idx];

    // AM011 / AM019: space between ] and ( in link syntax — [text] (url) → [text](url)
    if (rule?.match(/^AM0(11|19)/) && /\]\s+\(/.test(before)) {
      const after = before.replace(/\]\s+\(/g, '](');
      return after !== before ? { before, after } : undefined;
    }

    // AM013: four or more backticks in fence — ```` → ```
    if (rule?.startsWith('AM013') && /`{4,}/.test(before)) {
      const after = before.replace(/`{4,}/g, '```');
      return after !== before ? { before, after } : undefined;
    }

    // AM007: anchor tag using [] instead of # — {[id]} → {#id}
    if (rule?.startsWith('AM007') && /\{\[/.test(before)) {
      const after = before.replace(/\{\[([^\]]+)\]\}/g, '{#$1}');
      return after !== before ? { before, after } : undefined;
    }

    // MD047: file must end with single newline — fix = append \n to last line
    if (rule?.startsWith('MD047')) {
      const after = before + '\n';
      return { before, after };
    }

    // MD031: fenced code block must be surrounded by blank lines
    // MD032: lists must be surrounded by blank lines
    // Both: insert a blank line before the reported line
    if (rule?.match(/^MD03[12]/) && idx > 0 && lines[idx - 1].trim() !== '') {
      return { before, after: '\n' + before };
    }

    // AM009: malformed Adobe markdown block
    if (rule?.startsWith('AM009')) {
      // Case 1: space between > and [! (e.g. "> [!NOTE]" → ">[!NOTE]")
      if (/>\s+\[!/.test(before)) {
        const after = before.replace(/>\s+\[!/g, '>[!');
        return after !== before ? { before, after } : undefined;
      }
      // Case 2: line is bare "[!NOTE]" with no > prefix — prepend >
      if (/^\s*\[!/.test(before) && !/^\s*>/.test(before)) {
        const after = before.replace(/^(\s*)(\[!)/, '$1>$2');
        return after !== before ? { before, after } : undefined;
      }
      // Case 3: "No > on AFM (NOTE) block line: CONTENT" — the missing > is on
      // the line just before the reported line number
      const noGtMatch = reason?.match(/No > on AFM \([^)]+\) block line:\s*(.+)/);
      if (noGtMatch && idx > 0) {
        const prevLine = lines[idx - 1];
        if (prevLine.trim() === noGtMatch[1].trim()) {
          return { before: prevLine, after: '>' + prevLine, fixLine: idx };
        }
      }
    }

    // MD001: heading levels should only increment by one — fix to expected level
    if (rule?.startsWith('MD001')) {
      const m = reason?.match(/Expected:\s*h(\d)/i);
      if (m && /^#+/.test(before)) {
        const targetLevel = parseInt(m[1]);
        const after = before.replace(/^(#+)/, '#'.repeat(targetLevel));
        return after !== before ? { before, after } : undefined;
      }
    }

    // MD004: unordered list style — asterisk → dash
    if (rule?.startsWith('MD004') && /^\s*\*\s/.test(before)) {
      const after = before.replace(/^(\s*)\*(\s)/, '$1-$2');
      return after !== before ? { before, after } : undefined;
    }

    // MD009: trailing spaces
    if (rule?.startsWith('MD009') && / +$/.test(before)) {
      const after = before.replace(/ +$/, '');
      return after !== before ? { before, after } : undefined;
    }

    // MD010: hard tabs → spaces (expand each tab to 2 spaces)
    if (rule?.startsWith('MD010') && /\t/.test(before)) {
      const after = before.replace(/\t/g, '  ');
      return after !== before ? { before, after } : undefined;
    }

    // MD018: no space after hash on ATX heading — #Title → # Title
    if (rule?.startsWith('MD018') && /^#+[^ #\n]/.test(before)) {
      const after = before.replace(/^(#+)([^ #\n])/, '$1 $2');
      return after !== before ? { before, after } : undefined;
    }

    // MD019: multiple spaces after hash on ATX heading — ##  Title → ## Title
    if (rule?.startsWith('MD019') && /^#+ {2,}/.test(before)) {
      const after = before.replace(/^(#+) {2,}/, '$1 ');
      return after !== before ? { before, after } : undefined;
    }

    // MD023: heading must start at beginning of line — remove leading spaces/tabs
    if (rule?.startsWith('MD023') && /^\s+#/.test(before)) {
      const after = before.trimStart();
      return after !== before ? { before, after } : undefined;
    }

    // MD022: headings should be surrounded by blank lines — insert blank line before
    if (rule?.startsWith('MD022') && idx > 0 && lines[idx - 1].trim() !== '') {
      return { before, after: '\n' + before };
    }

    // MD029: ordered list item prefix — any number. → 1.
    if (rule?.startsWith('MD029') && /^\s*\d+\./.test(before)) {
      const after = before.replace(/^(\s*)\d+(\.)/,'$11$2');
      return after !== before ? { before, after } : undefined;
    }

    if (fixStatus === 'path-fix' && fixCandidates?.[0]) {
      const srcDir = path.dirname(path.resolve(repoRoot, filePath));
      const relPath = path.relative(srcDir, path.resolve(repoRoot, fixCandidates[0]));
      const basename = path.basename(target.split('#')[0]);
      let after = before.replace(
        new RegExp(`\\]\\([^)]*${escapeRe(basename)}((?:#[^)"# ]+)?(?:\\s+"[^"]*")?\\))`),
        `](${relPath}$1`
      );
      if (after === before) {
        after = before.replace(
          new RegExp(`(href=["'])(?:[^"']*/)${escapeRe(basename)}((?:#[^"']+)?["'])`),
          `$1${relPath}$2`
        );
      }
      return after !== before ? { before, after } : undefined;
    }

    if (fixStatus === 'delink') {
      const basename = path.basename(target.split('#')[0]);
      let after = before
        .replace(new RegExp(`\\[([^\\]]+)\\]\\([^)]*${escapeRe(basename)}[^)]*\\)(?:\\{[^}]*\\})?`, 'g'), '$1')
        .replace(new RegExp(`<a[^>]*href="[^"]*${escapeRe(basename)}[^"]*"[^>]*>([^<]*)<\\/a>`, 'g'), '$1')
        .replace(/(?<!\))\{target="_blank"\}/g, '');
      return after !== before ? { before, after } : undefined;
    }
  } catch { /* ignore */ }
  return undefined;
}

function parseLogErrors(runId: number, logs: string, repoRoot: string): BuildSummary {
  const errors: BuildError[] = [];
  const unparsed: BuildSummary['unparsed'] = [];

  for (const rawLine of logs.split('\n')) {
    const line = rawLine.replace(TIMESTAMP_PREFIX, '');
    if (!line.match(/(?:MD|AM)\d+/)) { continue; }
    if (!line.includes('help/') && !line.includes('main/') && !line.includes('content/')) { continue; }

    const m = ERROR_LINE.exec(line);
    if (!m) { unparsed.push({ line }); continue; }

    let [, filePath, lineno, rule, reason] = m;
    filePath = filePath.replace(CONTENT_PREFIX, '');
    reason = reason.trim();

    const target = extractTarget(rule, reason);
    const absPath = path.join(repoRoot, filePath);
    const active = errorStillActive(absPath, parseInt(lineno), target, repoRoot, filePath);
    const { fixStatus, fixCandidates, diffHunk } = target
      ? evaluateFix(repoRoot, target, filePath)
      : { fixStatus: 'unknown' as const, fixCandidates: undefined, diffHunk: undefined };

    const proposedFix = active
      ? computeProposedFix(repoRoot, filePath, lineno, target, fixStatus, fixCandidates, rule, reason)
      : undefined;

    errors.push({ filepath: filePath, lineno, rule, reason, target, active, fixStatus, fixCandidates, diffHunk, proposedFix });
  }

  return { runId, errors, unparsed };
}

export async function getRunErrors(config: GhecConfig, runId: number, repoRoot: string): Promise<BuildSummary | null> {
  const jobsUrl = `${config.apiBase}/repos/${config.owner}/${config.repo}/actions/runs/${runId}/jobs`;
  let jobsData: any;
  try { jobsData = JSON.parse(await httpsGet(jobsUrl, config.token)); } catch { return null; }
  const jobs: any[] = jobsData.jobs || [];

  // Prefer the validate-articles job; fall back to any failed job
  const job = jobs.find(j => j.name.includes('validate-articles'))
    ?? jobs.find(j => j.conclusion === 'failure')
    ?? jobs[0];
  if (!job) { return null; }

  const logsUrl = `${config.apiBase}/repos/${config.owner}/${config.repo}/actions/jobs/${job.id}/logs`;
  const logs = await httpsGet(logsUrl, config.token);
  return parseLogErrors(runId, logs, repoRoot);
}
