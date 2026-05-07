import { execSync } from 'child_process';

export interface GhecConfig {
  apiBase: string;
  owner: string;
  repo: string;
  token: string;
  currentBranch: string;
  repoRoot: string;
}

const API_BASE = 'https://api.github.com';

function parseOwnerRepo(cwd: string): { owner: string; repo: string } {
  let remote: string;
  try {
    remote = execSync('git remote get-url origin', { cwd, encoding: 'utf8' }).trim();
  } catch {
    throw new Error('No git remote named "origin" — add one with: git remote add origin <url>');
  }
  // Match github.com HTTPS/SSH and custom SSH host aliases (e.g. github-adobe)
  const match = remote.match(/github[^:/]*[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(
      `Remote URL "${remote}" does not look like a GitHub remote. ` +
      'Expected format: https://github.com/owner/repo or git@github.com:owner/repo'
    );
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

function getCurrentBranch(cwd: string): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getRepoRoot(cwd: string): string {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf8' }).trim();
  } catch {
    throw new Error('Current directory is not inside a git repository.');
  }
}

/** Try to get a token from the gh CLI — works if user is already authenticated. */
export function getGhToken(): string | null {
  try {
    const token = execSync('gh auth token', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return token || null;
  } catch {
    return null;
  }
}

/** Throws a descriptive Error if the workspace is not a valid GitHub repo. */
export function buildConfig(token: string, cwd: string): GhecConfig {
  const repoRoot = getRepoRoot(cwd);
  const parsed = parseOwnerRepo(cwd);

  return {
    apiBase: API_BASE,
    owner: parsed.owner,
    repo: parsed.repo,
    token,
    currentBranch: getCurrentBranch(cwd),
    repoRoot,
  };
}
