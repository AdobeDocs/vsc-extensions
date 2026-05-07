// @ts-check

"use strict";

import {
  forEachLine,
  forEachHeading,
  addErrorContext,
  createCodeFenceState,
  updateCodeFenceState,
} from "./custom-shared.mjs";

export const names = ["AM042", "unknown-snippet-tags"];
export const description =
  "Snippet tags {{tag}} must be defined with corresponding {#tag} anchors";
export const tags = ["snippets"];

export function function_(params, onError) {
  // Only check files that are specifically the snippets.md file in _includes
  const filename = params.name || "";
  if (!filename.endsWith("/help/_includes/snippets.md")) {
    return; // Skip validation for non-snippets files
  }

  const definedSnippets = new Set();
  const usedSnippets = new Map(); // Map of snippet -> [line numbers where used]

  // First pass: collect all defined snippet tags from headings
  forEachHeading(params, function (token, headingText) {
    const snippetMatch = headingText.match(/\{#([A-Za-z0-9\-]+)\}/);
    if (snippetMatch) {
      definedSnippets.add(snippetMatch[1]);
    }
  });

  // Second pass: find all used snippet tags
  let codeFenceState = createCodeFenceState();
  forEachLine(params, function (line, lineIndex) {
    const lineNumber = lineIndex + 1;
    const prevInCodeBlock = codeFenceState.inCodeBlock;
    codeFenceState = updateCodeFenceState(line, codeFenceState);
    const incode = codeFenceState.inCodeBlock;

    // Skip code blocks and comments
    if (incode || prevInCodeBlock || line.trim().startsWith("<!--")) {
      return;
    }

    // Find snippet usage patterns {{tag}}
    const snippetMatches = line.matchAll(/\{\{([A-Za-z\-]+?)\}\}/g);
    for (const match of snippetMatches) {
      const snippetTag = match[1];

      // Skip metadata tags (starting with __meta_)
      if (snippetTag.startsWith("__meta_")) {
        continue;
      }

      // Skip include directives (lines starting with {{$)
      if (line.trim().startsWith("{{$")) {
        continue;
      }

      if (!usedSnippets.has(snippetTag)) {
        usedSnippets.set(snippetTag, []);
      }
      usedSnippets.get(snippetTag).push(lineNumber);
    }
  });

  // Check for unknown snippet tags
  for (const [snippetTag, lineNumbers] of usedSnippets) {
    if (!definedSnippets.has(snippetTag)) {
      for (const lineNumber of lineNumbers) {
        const line = params.lines[lineNumber - 1] || "";
        addErrorContext(
          onError,
          lineNumber,
          `Unknown snippet tag "{{${snippetTag}}}" - not defined in this file`,
        );
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
