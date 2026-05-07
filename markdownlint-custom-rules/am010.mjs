// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM010", "id-tag-has-hash"];
export const description = "ID Tags ({#id-tag-name} cannot contain additional hash marks ({#id-has-#hash}";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, "heading_open", function forToken(token) {
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
        const rawLine = params.lines[startLine - 1] || "";
        var heading_title = rawLine.replace(/^[#]+ /g, "");
        if (heading_title.match(/.*{#.*[#].*}/)) {
            shared.addErrorContext(onError, startLine, rawLine);
        }
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};