// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM031", "anchor-equals-reserved-id"];
export const description = "Anchors cannot be one of the reserved anchor ids";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    var reserved_anchor_ids = ["search", "exports"];
    const pattern = reserved_anchor_ids.map(id => `\\{#${id}\\}`).join('|');
    const regex = new RegExp(pattern);

    shared.forEachHeading(params, function (token, heading_title) {
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
        const rawLine = (params.lines[startLine - 1] || "").replace(/^[#]+ /g, "");
        if (heading_title.toLowerCase().match(regex)) {
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