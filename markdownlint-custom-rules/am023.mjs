// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM023", "missing-table-pipes"];
export const description = "Table must use outer pipes";
export const tags = ["tables"];

export function function_(params, onError) {
    shared.filterTokens(params, "table_open", (token) => {
        // remove whitespace and > if it's a note block
        const ln = (Array.isArray(token.map)? (token.map[0]+1) : ((token.lineNumber||1)));
        const line = (params.lines[ln - 1] || "").trim().replace(/^>/, "").trim();
        if (!line.startsWith("|")) {
            var lineNumber = ln; // + params.frontMatterLines.length;
            // console.log(token, params.frontMatterLines.length)
            shared.addError(onError, lineNumber);
        }
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};