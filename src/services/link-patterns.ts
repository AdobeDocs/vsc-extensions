import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * A known EXL link error pattern with a detection rule and fix strategy.
 */
export interface LinkPattern {
  id: string;
  name: string;
  description: string;
  /**
   * When true, matching URLs are suppressed (not reported, not fixed).
   * Use for known false positives the link checker cannot verify (e.g. SPA routes).
   */
  suppress?: true;
  /** Returns true if this pattern applies to the given URL. */
  detect(url: string): boolean;
  /**
   * Attempt to produce a fixed URL.
   * Returns the fixed URL string, or null if this pattern cannot fix it.
   * Not called when suppress is true.
   * @param url       The broken URL as it appears in the markdown source.
   * @param sourceFile Absolute path to the file containing the link.
   * @param repoRoot  Absolute path to the repository root.
   */
  fix(url: string, sourceFile: string, repoRoot: string): string | null;
}

/** Resolve a relative URL from a source file to an absolute path. */
function resolveFromSource(sourceFile: string, url: string): string {
  const clean = url.split('#')[0].split('?')[0];
  return path.resolve(path.dirname(sourceFile), clean);
}

/** Search repo for a file by suffix. Returns matches relative to repoRoot. */
function findInRepo(repoRoot: string, suffix: string): string[] {
  try {
    const result = execSync(
      `find . -path '*/${suffix}' -not -path '*/.git/*'`,
      { cwd: repoRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    return result ? result.split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Preserve the #anchor fragment from the original URL. */
function withAnchor(fixedBase: string, originalUrl: string): string {
  const idx = originalUrl.indexOf('#');
  return idx >= 0 ? fixedBase + originalUrl.slice(idx) : fixedBase;
}

/**
 * Common EXL link error patterns — internal and external.
 * Applied in order — first match wins.
 */
export const EXL_LINK_PATTERNS: LinkPattern[] = [
  {
    id: 'marketo-api-spa',
    name: 'Marketo API SPA route',
    description: 'developer.adobe.com/marketo-apis/api/* URLs are served by a Redocly SPA. ' +
      'The link checker cannot verify SPA routes (hash fragments are client-side only) ' +
      'and flags redirects through the # base. These are always false positives.',
    suppress: true,
    detect: (url) => /^https:\/\/developer\.adobe\.com\/marketo-apis\/api\//.test(url.split('#')[0].replace(/\/+$/, '')),
    fix: () => null,
  },

  {
    id: 'external-trailing-slash',
    name: 'External URL trailing slash',
    description: 'External URLs should not end with /. The CI link checker flags these as broken.',
    detect: (url) => url.startsWith('http') && url.split('#')[0].endsWith('/'),
    fix: (url, _sourceFile, _repoRoot) => {
      // Strip the trailing slash — cannot verify externally, but it is the known fix.
      const anchor = url.includes('#') ? url.slice(url.indexOf('#')) : '';
      return url.split('#')[0].replace(/\/+$/, '') + anchor;
    },
  },

  {
    id: 'trailing-slash',
    name: 'Trailing slash',
    description: 'Internal links must not end with /. Remove the slash; add .md if missing.',
    detect: (url) => !url.startsWith('http') && url.split('#')[0].endsWith('/'),
    fix: (url, sourceFile, _repoRoot) => {
      const anchor = url.includes('#') ? url.slice(url.indexOf('#')) : '';
      const base = url.split('#')[0].replace(/\/+$/, '');
      // Try: no slash, then no slash + .md
      for (const candidate of [base + anchor, base + '.md' + anchor]) {
        const abs = resolveFromSource(sourceFile, candidate);
        if (fs.existsSync(abs)) { return candidate; }
      }
      return null;
    },
  },

  {
    id: 'missing-md-extension',
    name: 'Missing .md extension',
    description: 'EXL internal links must end in .md. Append .md to extensionless paths.',
    detect: (url) => !url.startsWith('http') && !path.extname(url.split('#')[0]) && !url.split('#')[0].endsWith('/'),
    fix: (url, sourceFile, _repoRoot) => {
      const anchor = url.includes('#') ? url.slice(url.indexOf('#')) : '';
      const base = url.split('#')[0];
      const candidate = base + '.md' + anchor;
      const abs = resolveFromSource(sourceFile, candidate);
      return fs.existsSync(abs) ? candidate : null;
    },
  },

  {
    id: 'wrong-path-prefix',
    name: 'Wrong path prefix',
    description: 'The file exists in the repo but at a different path. Correct the relative path.',
    detect: (url) => !url.startsWith('http'),
    fix: (url, sourceFile, repoRoot) => {
      const base = url.split('#')[0].replace(/\/+$/, '');
      const basename = path.basename(base);
      const ext = path.extname(basename);

      // Try with and without .md extension
      const suffixes = ext ? [basename] : [basename, basename + '.md'];
      for (const suffix of suffixes) {
        const matches = findInRepo(repoRoot, suffix);
        if (matches.length === 1) {
          const absMatch = path.resolve(repoRoot, matches[0].replace(/^\.\//, ''));
          const rel = path.relative(path.dirname(sourceFile), absMatch);
          const relFixed = rel.startsWith('.') ? rel : './' + rel;
          return withAnchor(relFixed, url);
        }
      }
      return null;
    },
  },

  {
    id: 'absolute-internal-link',
    name: 'Absolute internal link',
    description: 'Internal links starting with /help/... are repo-relative, not truly absolute. Convert to a proper relative path.',
    detect: (url) => !url.startsWith('http') && url.startsWith('/'),
    fix: (url, sourceFile, repoRoot) => {
      const base = url.split('#')[0].replace(/\/+$/, '');
      const relative = base.replace(/^\//, '');
      const abs = path.join(repoRoot, relative);
      if (fs.existsSync(abs)) {
        const rel = path.relative(path.dirname(sourceFile), abs);
        const relFixed = rel.startsWith('.') ? rel : './' + rel;
        return withAnchor(relFixed, url);
      }
      // Try with .md
      const absMd = abs + '.md';
      if (fs.existsSync(absMd)) {
        const rel = path.relative(path.dirname(sourceFile), absMd);
        const relFixed = rel.startsWith('.') ? rel : './' + rel;
        return withAnchor(relFixed, url);
      }
      return null;
    },
  },
];

/**
 * Run all patterns against a URL and return the first fix that resolves to
 * a real file, or null if none apply.
 * Returns { suppressed: true } if a suppress pattern matches.
 */
export function tryFixUrl(
  url: string,
  sourceFile: string,
  repoRoot: string
): { patternId: string; fixedUrl: string } | { suppressed: true; patternId: string } | null {
  for (const pattern of EXL_LINK_PATTERNS) {
    if (!pattern.detect(url)) { continue; }
    if (pattern.suppress) {
      return { suppressed: true, patternId: pattern.id };
    }
    const fixed = pattern.fix(url, sourceFile, repoRoot);
    if (fixed !== null) {
      return { patternId: pattern.id, fixedUrl: fixed };
    }
  }
  return null;
}
