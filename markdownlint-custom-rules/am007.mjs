// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM007", "header-anchor-without-hash"];
export const description = "Heading anchor has no hash";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    const anchorMissingHashRe = new RegExp("{[^#][^=]*}$");
    shared.forEachHeading(params, function forHeading(token, content) {
        content = content.replace(/{{.*?}}/, 'SNIPPET');
        const match = anchorMissingHashRe.exec(content);
        if (match) {
            const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
            const rawLine = params.lines[startLine - 1] || "";
            shared.addError(onError, startLine,
                "Anchor without #: '" + match[0] + "'", null,
                shared.rangeFromRegExp(rawLine, anchorMissingHashRe));
        }
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};