import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import type { BuildError } from './ghec-service';

export function runLocalLint(
  repoRoot: string,
  extensionPath: string,
  changedFiles: string[]
): BuildError[] {
  const mdFiles = changedFiles.filter(f => f.endsWith('.md'));
  if (mdFiles.length === 0) { return []; }

  const errors: BuildError[] = [];

  // ── markdownlint-cli2 (via ESM runner) ──────────────────────────────────────
  try {
    const runnerPath = path.join(extensionPath, 'markdownlint-custom-rules', 'run-lint.mjs');
    const rulesPath  = path.join(extensionPath, 'markdownlint-custom-rules', 'rules.mjs');
    const absFiles   = mdFiles.map(f => path.join(repoRoot, f));

    const proc = spawnSync('node', [runnerPath, rulesPath, repoRoot, ...absFiles], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30_000,
    });

    if (proc.stdout) {
      const results: Record<string, any[]> = JSON.parse(proc.stdout);
      for (const [filePath, fileErrors] of Object.entries(results)) {
        const relFile = path.relative(repoRoot, filePath).replace(/\\/g, '/');
        for (const e of fileErrors) {
          const rule = (e.ruleNames as string[]).join('/');
          const detail = e.errorDetail ? ': ' + e.errorDetail : '';
          errors.push({
            filepath: relFile,
            lineno: String(e.lineNumber ?? 1),
            rule,
            reason: (e.ruleDescription ?? rule) + detail,
            target: '',
            active: true,
            fixStatus: 'unknown',
            source: 'local',
          });
        }
      }
    }
  } catch (e) { console.debug('[local-lint] markdownlint-cli2 skipped:', e); }

  // ── cspell ──────────────────────────────────────────────────────────────────
  try {
    const absFiles = mdFiles.map(f => path.join(repoRoot, f));
    const wordsFile = path.join(extensionPath, 'assets', 'cspell-exl-words.txt');
    const cspellConfig = path.join(extensionPath, 'cspell.json');
    const args = [
      '--no-progress', '--no-summary', '--no-color',
      ...(fs.existsSync(cspellConfig) ? ['--config', cspellConfig] : [
        '--ignore-regexp', '`[^`\\n]+`',           // inline code
        '--ignore-regexp', 'https?://\\S+',         // URLs
        '--ignore-regexp', '\\[![A-Z_][A-Z0-9_]*[^\\]]*\\]', // EXL macros [!NOTE] [!DNL ...] etc.
        '--ignore-regexp', '\\{[^}]+\\}',           // attribute blocks {#id} {width="640"}
        ...(fs.existsSync(wordsFile) ? ['--words-only', '--user-words-file', wordsFile] : []),
      ]),
      ...absFiles,
    ];
    const result = spawnSync('cspell', args, { cwd: repoRoot, encoding: 'utf8' });

    for (const line of (result.stdout || '').split('\n')) {
      // cspell output: /abs/path/file.md:14:7 - Unknown word (someword)
      // The separator is " - " but locale may vary; match flexibly on the colon-number-number prefix.
      const m = line.match(/^(.+?):(\d+):\d+\s+-\s+(.+)$/);
      if (!m) { continue; }
      const relFile = path.relative(repoRoot, m[1]).replace(/\\/g, '/');
      errors.push({
        filepath: relFile,
        lineno: m[2],
        rule: 'SPELL',
        reason: m[3],
        target: '',
        active: true,
        fixStatus: 'unknown',
        source: 'local',
      });
    }
  } catch (e) { console.debug('[local-lint] cspell skipped:', e); }

  return errors;
}
