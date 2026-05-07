// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM018", "blanks-around-blockquotes"];
export const description = "Block quotes should be surrounded by blank lines";
export const tags = ["blockquote", "blank_lines"];

export function function_(params, onError) {
    var checklines = [];
    shared.filterTokens(params, "blockquote_open", function forToken(token) {
        var index = 0;
        checklines.push(token.map[0]);       // 1-indexed line before blockquote
        checklines.push(token.map[1] + 1);  // 1-indexed line after blockquote
    });

    shared.forEachLine(params, function forLine(line, i) {
        var err = "  ";
        if (checklines.includes(i + 1)) {
            if (line.replace(/\s/g, "").length && !line.match(/^[\s]*\>/)) {
                shared.addErrorContext(onError, i + 1, line);
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