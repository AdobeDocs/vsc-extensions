// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM024", "List item bullet/numner on line by itself"];
export const description = "List items should contian content on bullet line";
export const tags = ["bullet", "ul", "ol"];

const listItemMarkerInterruptsRe = /^[\s>]*(?:[*+-]|1\.)\s+/;
const blankOrListRe = /^[\s>]*($|\s)/;

export function function_(params, onError) {
    let inList = false;
    let prevLine = "";

    shared.filterTokens(params, "list_item_open", (token) => {
        const ln = (Array.isArray(token.map)? (token.map[0]+1) : ((token.lineNumber||1)));
        let match = /^[0-9*+-]+[\.]*$/.exec((params.lines[ln - 1] || "").trim());
        if (match) {
            shared.addErrorContext(onError, ln, params.lines[ln - 1]);
        }
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};