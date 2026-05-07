// @ts-check

"use strict";

import { filterTokens, addErrorContext } from "./custom-shared.mjs";

export const names = ["AM003", "hr not supported"];
export const description = "Horizontal rules are not supported";
export const tags = ["hr"];

/**
 * Helper function to report horizontal rule errors
 * Extracts common error reporting logic to reduce duplication
 */
function reportHrError(token, params, onError) {
  // token.map[0] is 0-indexed line number RELATIVE TO params.lines (content without frontmatter)
  // markdownlint automatically adds frontMatterLines.length when reporting errors,
  // so we just use the line number as-is (but convert to 1-indexed)
  const startLine = Array.isArray(token.map) ? token.map[0] + 1 : (token.lineNumber || 1);
  const raw_line = params.lines[startLine - 1] || "";
  addErrorContext(onError, startLine, raw_line);
}

/**
 * Helper function to scan tokens for HTML <hr> tags
 */
function scanHtmlForHr(params, tokenType, hrRegex, onError) {
  filterTokens(params, tokenType, (token) => {
    if (hrRegex.test(token.content)) {
      reportHrError(token, params, onError);
    }
  });
}

export function function_(params, onError) {
  // Check for markdown horizontal rules (---, ***, ___)
  filterTokens(params, "hr", (token) => {
    reportHrError(token, params, onError);
  });

  // Check for HTML <hr> tags in html_block and html_inline tokens
  // More precise regex: /<hr(?:\s+[^>]*)?(?:\/?>|>)/i matches:
  // - <hr> <hr/> <hr /> <hr class="..."> <hr class="..." /> etc.
  // - Case-insensitive to catch <HR>, <Hr>, etc.
  // - Avoids false positives like "something<hr2" (requires proper tag ending)
  const hrRegex = /<hr(?:\s+[^>]*)?(?:\/?>|>)/i;

  scanHtmlForHr(params, "html_block", hrRegex, onError);
  scanHtmlForHr(params, "html_inline", hrRegex, onError);
}

export default {
  names,
  description,
  tags,
  function: function_,
};