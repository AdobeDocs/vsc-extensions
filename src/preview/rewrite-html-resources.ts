import * as path from 'path';
import * as fs from 'fs';
import { Uri, Webview, workspace } from 'vscode';

function isExternalRef(ref: string): boolean {
  const t = ref.trim();
  if (!t || t.startsWith('#')) {
    return true;
  }
  if (/^https?:\/\//i.test(t)) {
    return true;
  }
  if (/^mailto:/i.test(t)) {
    return true;
  }
  if (/^data:/i.test(t)) {
    return true;
  }
  if (t.startsWith('//')) {
    return true;
  }
  return false;
}

/**
 * Directories we treat as roots for resolving `![…](path)` and local links.
 * Workspace folders when present; otherwise the markdown file's directory (single-file).
 */
export function previewResourceRootFsPaths(sourceFsPath: string): string[] {
  const ws =
    workspace.workspaceFolders?.map((f) => path.resolve(f.uri.fsPath)) ?? [];
  if (ws.length > 0) {
    return ws;
  }
  return [path.resolve(path.dirname(sourceFsPath))];
}

function isUnderWorkspaceRoots(absNormalized: string, roots: string[]): boolean {
  const norm = path.normalize(absNormalized);
  return roots.some((r) => norm === r || norm.startsWith(r + path.sep));
}

/**
 * Resolve a relative or absolute file reference against the markdown source file.
 */
export function resolveLocalPath(
  sourceFsPath: string,
  ref: string,
  roots: string[]
): string | undefined {
  const trimmed = ref.trim().split('#')[0].split('?')[0];
  if (!trimmed || isExternalRef(trimmed)) {
    return undefined;
  }

  const baseDir = path.dirname(sourceFsPath);
  let candidate: string;
  if (path.isAbsolute(trimmed)) {
    candidate = path.normalize(trimmed);
  } else {
    candidate = path.normalize(path.resolve(baseDir, trimmed));
  }

  if (!isUnderWorkspaceRoots(candidate, roots)) {
    return undefined;
  }

  try {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Rewrite local image src to webview URIs so assets load in the panel.
 */
export function rewriteHtmlLocalResources(
  html: string,
  sourceFsPath: string,
  webview: Webview
): string {
  const roots = previewResourceRootFsPaths(sourceFsPath);

  const rewriteAttr = (
    tagPattern: string,
    attr: string,
    input: string
  ): string => {
    const re = new RegExp(
      `<${tagPattern}\\b([^>]*?)\\s${attr}=(["'])([^"']*)\\2`,
      'gi'
    );
    return input.replace(re, (full, inner, q, val) => {
      const raw = String(val).trim();
      if (!raw || isExternalRef(raw)) {
        return full;
      }
      const abs = resolveLocalPath(sourceFsPath, raw, roots);
      if (!abs) {
        return full;
      }
      const uri = webview.asWebviewUri(Uri.file(abs)).toString();
      return `<${tagPattern.toLowerCase()}${inner} ${attr}=${q}${uri}${q}`;
    });
  };

  let out = html;
  out = rewriteAttr('img', 'src', out);
  out = rewriteAttr('object', 'data', out);
  out = rewriteAttr('embed', 'src', out);
  return out;
}
