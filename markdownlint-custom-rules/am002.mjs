// @ts-check

"use strict";

import { forEachHeading, addErrorContext } from "./custom-shared.mjs";

export const names = ["AM002", "id-tag-has-spaces"];
export const description = "ID Tags ({#id-tag-name} cannot contain spaces";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    let prevLevel = 0;
    forEachHeading(params, function forHeading(token, heading_title) {
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));

        const raw_line = params.lines[startLine - 1] || "";
        if (heading_title.match(/.*{#.*[ ].*}/)) {
            addErrorContext(onError, startLine, raw_line);
        }
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};