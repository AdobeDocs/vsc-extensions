// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM030", "anchor-equals-search"];
export const description = "Anchors should not be the word 'search'";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    shared.forEachHeading(params, function (token, heading_title) {
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
        const rawLine = (params.lines[startLine - 1] || "").replace(/^[#]+ /g, "");

        if (heading_title.toLowerCase().match(/.*{#search}/)) {
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