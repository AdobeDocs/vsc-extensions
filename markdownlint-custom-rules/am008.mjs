// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM008", "header-contains-link"];
export const description = "Heading contains link";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    // const headingHasLinkRe = new RegExp("[^!]\\[.*\\]\\(.*\\)");
    const headingHasLinkRe = new RegExp("(^|[^!])\\[.*\\]\\(.*\\)");
    shared.forEachHeading(params, function forHeading(token, content) {
        const match = headingHasLinkRe.exec(content);
        if (match) {
            const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
            const rawLine = params.lines[startLine - 1] || "";
            shared.addError(onError, startLine,
                "Heading contains a link: '" + match[0] + "'", null,
                shared.rangeFromRegExp(rawLine, headingHasLinkRe));
        }
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};