// @ts-check

"use strict";

import path from "path";
import * as shared from "./custom-shared.mjs";

export const names = ["AM053", "hide-from-toc-format"];
export const description = "Validate directive format in TOC list items; flag unknown directives";
export const tags = ["toc", "hide-from-toc", "adobe-markdown"];

/**
 * Known directives allowed in TOC list items. Add new directives here as they are introduced.
 * Format: {name} or {.name} (e.g. {hide-from-toc}, {.hide-from-toc})
 */
const KNOWN_DIRECTIVES = ["hide-from-toc"];

/**
 * Check if this is a TOC.md file or a test file for hide-from-toc validation
 */
function isTOCOrTestFile(filename) {
  if (!filename) return false;
  const normalized = filename.replace(/\\/g, "/");
  const base = path.basename(normalized);
  return (
    base.endsWith("TOC.md") ||
    base.endsWith("TOC.MD") ||
    base.includes("test-am053-")
  );
}

/**
 * Valid leading format: {hide-from-toc} or {.hide-from-toc} followed by optional space and content.
 * Matches exl-html-converter normalizeLeadingHideFromToc regex (UGP-14611).
 */
const VALID_LEADING = /^(\s*[-+*]\s+)\{\.?hide-from-toc\}\s*(.+)$/;

/**
 * Valid trailing format: [Link](url){.hide-from-toc}
 */
const VALID_TRAILING = /\{.hide-from-toc\}$/;

/**
 * Match directive patterns {name} or {.name}; excludes section identifiers {#id}
 */
const DIRECTIVE_PATTERN = /\{(?!\#)\.?([a-zA-Z0-9-]+)\}/g;

/**
 * Malformed: unclosed brace, wrong format, spaces inside directive name
 */
const MALFORMED_PATTERNS = [
  { regex: /\{\.?hide-from-toc\s*[^}]/, msg: "Unclosed {hide-from-toc} directive (missing })" },
  { regex: /\{\.?hide-from-toc\s+\}/, msg: "No space allowed before } in {hide-from-toc}" },
  { regex: /\{\s+hide-from-toc\}/, msg: "No space allowed after { in {hide-from-toc}" },
  { regex: /\{hide\s+from\s+toc\}/i, msg: "Use {hide-from-toc} or {.hide-from-toc} (hyphens, no spaces)" },
  { regex: /\{\.\s+hide-from-toc\}/, msg: "No space allowed after . in {.hide-from-toc}" },
];

export function function_(params, onError) {
  if (!isTOCOrTestFile(params.name)) return;

  let codeFenceState = shared.createCodeFenceState();

  shared.forEachLine(params, (line, i) => {
    const lineNumber = i + 1;

    codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
    const inCodeBlock = codeFenceState.inCodeBlock;
    if (inCodeBlock) return;

    // Only check list items (TOC format: - , + , or * )
    if (!/^\s*[-+*]\s+/.test(line)) return;

    // Check for unknown directives (e.g. {no-render}, {no-show})
    let match;
    DIRECTIVE_PATTERN.lastIndex = 0; // reset global regex
    while ((match = DIRECTIVE_PATTERN.exec(line)) !== null) {
      const directiveName = match[1];
      if (!KNOWN_DIRECTIVES.includes(directiveName)) {
        shared.addError(
          onError,
          lineNumber,
          `Unknown directive {${directiveName}}; known directives: ${KNOWN_DIRECTIVES.join(", ")}`,
          line
        );
        return;
      }
    }

    // Check for malformed hide-from-toc
    for (const { regex, msg } of MALFORMED_PATTERNS) {
      if (regex.test(line)) {
        shared.addError(onError, lineNumber, msg, line);
        return;
      }
    }

    // Flag multiple hide-from-toc directives on same line
    const hideFromTocMatches = line.match(/\{\.?hide-from-toc\}/g);
    if (hideFromTocMatches && hideFromTocMatches.length > 1) {
      shared.addError(
        onError,
        lineNumber,
        "Only one {hide-from-toc} or {.hide-from-toc} directive per list item",
        line
      );
      return;
    }

    // If line contains hide-from-toc, validate format
    if (/\{\.?hide-from-toc\}/.test(line)) {
      const afterMarker = line.replace(/^\s*[-+*]\s+/, "");

      // Leading: {hide-from-toc} or {.hide-from-toc} + optional space + content
      if (VALID_LEADING.test(line)) return;

      // Trailing: content ends with {.hide-from-toc}
      if (VALID_TRAILING.test(afterMarker.trim())) return;

      // Has directive but format doesn't match - could be mid-line or wrong placement
      if (/\{\.?hide-from-toc\}/.test(afterMarker) && !VALID_LEADING.test(line)) {
        shared.addError(
          onError,
          lineNumber,
          "Use leading {- {hide-from-toc} content} or trailing {[Link](url){.hide-from-toc}}",
          line
        );
      }
    }
  });
}

export default {
  names,
  description,
  tags,
  function: function_,
};
