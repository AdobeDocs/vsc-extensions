// @ts-check
"use strict";

import path from "path";
import * as shared from "./custom-shared.mjs";

export const names = ["AM055", "toc-duplicate-relative-refs"];
export const description =
  "An article (.md) may be linked via a relative path from at most one TOC; other TOCs must use absolute URLs";
export const tags = ["toc", "table-of-contents", "links"];

/**
 * Track the first relative-link reference for each canonical article path.
 * Map<canonicalPath, { file: string, line: number, tocFiles: Set<string> }>
 */
const firstSeenByCanonical = new Map();

/**
 * Same basename (e.g. note-test.md) with different resolved paths across TOCs — authors often
 * copy the same relative href; each TOC resolves it differently. Only one relative link per
 * article; other references must be absolute URLs.
 * Map<basename, { canonical: string, file: string, line: number }>
 */
const firstSeenByArticleBasename = new Map();

function isTOCFile(filename) {
  const base = path.basename(String(filename).replace(/\\/g, "/")).toLowerCase();
  return base === "toc.md";
}

function normalizeLocalMdHref(rawHref, tocFilePath) {
  if (!rawHref) return null;

  // Strip #fragment and ?query
  let href = rawHref.trim().split("#")[0].split("?")[0].trim();

  // Allow absolute URLs to repeat (ticket requirement)
  if (href.startsWith("https://")) return null;

  // Only local .md
  if (!href.toLowerCase().endsWith(".md")) return null;

  href = href.replace(/\\/g, "/");

  const tocPosix = tocFilePath.replace(/\\/g, "/");
  const tocDir = path.posix.dirname(tocPosix);

  const resolved = href.startsWith("/")
    ? href // repo-root-ish
    : path.posix.join(tocDir, href); // relative to TOC folder

  const normalized = path.posix.normalize(resolved).replace(/\\/g, "/");

  // If the resolved path contains /help/, canonicalize to that repo-root-ish path
  const helpIdx = normalized.toLowerCase().indexOf("/help/");
  if (helpIdx !== -1) {
    return normalized.slice(helpIdx).toLowerCase();
  }

  return normalized.toLowerCase();
}

export function function_(params, onError) {
  if (!isTOCFile(params.name)) return;
  const currentFile = params.name.replace(/\\/g, "/");

  shared.forEachLine(params, (line, lineIndex) => {
    // list item like: - [Title](href)
    const m = line.match(/^\s*[-+*]\s+\[[^\]]+]\(([^)]+)\)/);
    if (!m) return;

    const canonical = normalizeLocalMdHref(m[1], params.name);
    if (!canonical) return;

    const articleBasename = path.posix.basename(canonical);

    const existing = firstSeenByCanonical.get(canonical);
    if (existing) {
      const isSameTOC = existing.file === currentFile;
      const whereFirst = isSameTOC ? `line ${existing.line}` : `${existing.file}:${existing.line}`;
      existing.tocFiles.add(currentFile);
      const duplicateKind = isSameTOC ? "within the same TOC" : "across multiple TOCs";

      shared.addError(
        onError,
        lineIndex + 1,
        `Duplicate relative article reference ${duplicateKind}: '${canonical}' already referenced at ${whereFirst}. `,
        line.trim(),
        null
      );
      return;
    }

    const basenameHit = firstSeenByArticleBasename.get(articleBasename);
    if (basenameHit && basenameHit.canonical !== canonical) {
      const whereFirst = `${basenameHit.file}:${basenameHit.line}`;
      shared.addError(
        onError,
        lineIndex + 1,
        `Relative link reuses filename '${articleBasename}' but resolves to a different path than in another TOC (${basenameHit.canonical} vs ${canonical}). Only one relative .md link per article; use an absolute URL (e.g. Experience League) for other TOCs. First relative link was at ${whereFirst}. `,
        line.trim(),
        null
      );
      return;
    }

    firstSeenByCanonical.set(canonical, {
      file: currentFile,
      line: lineIndex + 1,
      tocFiles: new Set([currentFile]),
    });

    if (!basenameHit) {
      firstSeenByArticleBasename.set(articleBasename, {
        canonical,
        file: currentFile,
        line: lineIndex + 1,
      });
    }
  });
}

export default {
  names,
  description,
  tags,
  function: function_,
};