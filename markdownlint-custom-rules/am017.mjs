// @ts-check
/* eslint-disable */

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM017", "text-following-id-tag-heading"];
export const description = "No text or images after header ID Tags ({#id-tag-name}";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, "heading_open", function forToken(token) {
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
        const rawLine = params.lines[startLine - 1] || "";
        var line = rawLine.replace(/`.*?`/, "code").replace(/{{.*?}}/, "SNIPPET");
        // strip images before check
        line = line.replace(/!\[.*?\]\((.*?)\)([\s]*\{(.*?)\})?/, "");
        line = line.replace(/\[!BADGE.*?\][\s]*\{.*?\}[\s]*/, "");
        if (line.match(/^[#]+.*?{/gm)) {
            if (line.match(/^[#]+.*?{[#].*?}[\s]*$/gm)) {
                // console.log('GOOD:' + token.line + ' ' + line)
            } else {
                // console.log("BAD: " + rawLine + " " + line);
                shared.addErrorContext(onError, startLine, line);
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