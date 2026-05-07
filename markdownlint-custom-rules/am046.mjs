// @ts-check

"use strict";

import fs from "fs";
import path from "path";
import { parseFrontmatter, isLandingPage } from "./custom-shared.mjs";
import MetadataHierarchyResolver from "./metadata-hierarchy-resolver.mjs";

export const names = ["AM046", "missing-linked-file"];
export const description = "Linked file does not exist or is linked improperly";
export const tags = ["links", "files"];

// Initialize the hierarchy resolver
const hierarchyResolver = new MetadataHierarchyResolver();

export function function_(params, onError) {
  const docDir = path.dirname(params.name);

  // Check if this is a landing page
  let isLanding = false;
  try {
    // Try to read the file to get frontmatter
    let lines = params.lines;
    if (params.frontMatterLines && params.frontMatterLines.length > 0) {
      lines = [...params.frontMatterLines, ...params.lines];
    } else if (lines.length > 0 && !lines[0].trim().startsWith("---")) {
      // Try reading file directly if frontmatter was stripped
      try {
        const fileContent = fs.readFileSync(params.name, "utf8");
        lines = fileContent.split("\n");
      } catch (error) {
        // Continue with params.lines if file read fails
      }
    }

    const frontmatter = parseFrontmatter(lines);
    if (frontmatter.found && frontmatter.data) {
      isLanding = isLandingPage(params.name, frontmatter.data, hierarchyResolver);
    }
  } catch (error) {
    // If frontmatter parsing fails, assume not a landing page
    isLanding = false;
  }

  /**
   * EXL repos always use a top-level `help/` tree. Absolute links are `/help/...`
   * from the *repo root* (parent of `help`), not from process.cwd().
   *
   * @returns {string | null} Absolute path to repo root (directory containing `help`), or null
   */
  const getExlRepoRootAbsolute = (absDocPath) => {
    const norm = path.normalize(absDocPath);
    const parts = norm.split(path.sep).filter((p) => p.length > 0);
    const helpIdx = parts.indexOf('help');
    if (helpIdx <= 0) {
      return null;
    }
    return path.join(...parts.slice(0, helpIdx));
  };

  // Legacy fallback when the doc path has no `help` segment (tests / odd layouts)
  const getRepoRootRelativeToCwd = (filePath) => {
    const normalized = filePath.replace(/\\/g, '/');
    const cwd = process.cwd().replace(/\\/g, '/');

    let relativePath = normalized;
    if (path.isAbsolute(normalized)) {
      relativePath = path.relative(cwd, normalized).replace(/\\/g, '/');
    }

    const parts = relativePath.split('/').filter((p) => p.length > 0);

    const helpIndex = parts.indexOf('help');
    if (helpIndex === 0) {
      return '';
    }
    if (helpIndex > 0) {
      return parts[helpIndex - 1];
    }

    if (parts[0] === 'test') {
      return '';
    }

    return parts[0];
  };

  const exlRepoRootAbs = getExlRepoRootAbsolute(params.name);
  const repoRoot = getRepoRootRelativeToCwd(params.name);

  // Matches [text](link) and ![alt](link)
  const linkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;
  let insideCodeBlock = false;
  let insideHtmlComment = false;

  for (let i = 0; i < params.lines.length; i++) {
    let line = params.lines[i];
    // Find code blocks in order to skip them
    if (/^```/.test(line.trim())) {
      insideCodeBlock = !insideCodeBlock;
      continue;
    }

    // Skip HTML comments
    if (line.includes("<!--")) insideHtmlComment = true;
    if (insideHtmlComment && line.includes("-->")) {
      insideHtmlComment = false;
      continue;
    }
    if (insideHtmlComment) continue;

    // Skip HTML code blocks
    if (/<pre><code>/i.test(line)) {
      while (i < params.lines.length && !params.lines[i].match(/<\/code><\/pre>/i)) {
        i++;
      }
      continue;
    }

    if (insideCodeBlock) continue;

    // Skip inline code - properly handle all backtick variations
    // Markdown inline code: opening backticks + content + same number of closing backticks
    // Process in order: triple, double, then single to handle nested cases correctly
    // Since we process line-by-line, inline code won't span lines, so we can use simpler patterns

    // Skip admonition blocks with identifiers (e.g., >[!SLIDE](id), >[!VIDEO](url), >[!TAB](name))
    // These look like links but are special Adobe markdown syntax for callouts
    if (/^>\s*\[!([A-Z_]+)\]\(/.test(line.trim())) {
      continue;
    }

    // First pass: remove triple backticks (handles ```code```)
    line = line.replace(/```.*?```/g, "");

    // Second pass: remove double backticks (handles ``code with ` inside``)
    line = line.replace(/``.*?``/g, "");

    // Third pass: remove single backticks (handles `code`)
    line = line.replace(/`[^`]*`/g, "");

    let match;
    while ((match = linkRe.exec(line)) !== null) {
      let link = match[1].trim();

      // Ignore external links, mailto, anchors, and templates like {{__meta_homepage}}
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link) ||
        link.startsWith("#") ||
        link.startsWith("{{")) {
        continue;
      }

      // On landing pages, skip localized cross-repo links (e.g., /en/docs, /fr/docs, /de/help)
      // Pattern: starts with / followed by 2-letter language code, then another path segment
      if (isLanding && /^\/[a-z]{2}\//.test(link)) {
        continue;
      }

      // Strip query/hash and extra text after space
      link = link.split("#")[0].split("?")[0].split(" ")[0];

      // `/help/...` and other root-absolute EXL paths: resolve from repo root (parent of help/)
      const fullPath = link.startsWith("/")
        ? exlRepoRootAbs != null
          ? path.join(exlRepoRootAbs, link.replace(/^\/+/, ""))
          : path.join(process.cwd(), repoRoot, link.replace(/^\/+/, ""))
        : path.join(docDir, link);

      if (!fs.existsSync(fullPath)) {
        onError({
          lineNumber: i + 1,
          detail: `Linked file does not exist: ${link}`,
        });
      }
    }
  }
}

export default {
  names,
  description,
  tags,
  function: function_,
};
