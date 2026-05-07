// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM032", "heading-in-html-block"];
export const description = "Headings cannot be in HTML blocks";
export const tags = ["headings"];

export function function_(params, onError) {
    shared.filterTokens(params, "html_block", (token) => {
        var begin = token.map[0] + 1;
        var end = token.map[1];
        shared.forEachLine(params, function forLine(line, i) {
            // /^#{1,6}\s.*$/gm
            if (begin <= i + 1 && i + 1 <= end && line.match(/^#{1,6}\s+.+$/m)) {
                shared.addErrorContext(onError, i + 1, line);
            }
        });
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};