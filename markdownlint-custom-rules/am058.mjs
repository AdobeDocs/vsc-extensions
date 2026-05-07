// @ts-check

"use strict";

import { addError } from "./custom-shared.mjs";

export const names = ["AM058", "no-indented-code-blocks"];
export const description =
  "Indented code blocks are not allowed; use fenced code blocks instead";
export const tags = ["code", "fences", "indentation"];

export function function_(params, onError) {
  const tokens =
    params.parsers?.markdownit?.tokens ||
    params.tokens ||
    params.parsers?.micromark?.tokens ||
    [];

  for (const token of tokens) {
    if (token.type !== "code_block") {
      continue;
    }

    const lineNumber = token.lineNumber || (Array.isArray(token.map) ? token.map[0] + 1 : 1);
    addError(
      onError,
      lineNumber,
      "Indented code blocks are not allowed - use fenced code blocks (```)"
    );
  }
}

export default {
  names,
  description,
  tags,
  function: function_,
};
