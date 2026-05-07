// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM019", "link-syntax2"];
export const description = "Malformed link";
export const tags = ["link"];

export function function_(params, onError) {
    const codeBlockRe = new RegExp("```");
    var inCodeBlock = false;

    shared.forEachLine(params, function forLine(line, lineIndex) {
        const lineNumber = lineIndex + 1;
        const spaceinlink = line.match(/\[[^!].*?\]\s+\(/);
        const codeBlockMatch = codeBlockRe.exec(line);
        const spaceinurl = line.match(/\[[^!].*?\]\(\s+/);
        const pareninurl = line.match(/\[[^!].*?\]\(\(/);
        const bracesnotparens = line.match(/\]\{[^#]/);

        if (codeBlockMatch) {
            inCodeBlock = !inCodeBlock;
        }

        if (!inCodeBlock && spaceinurl != null) {
            shared.addError(onError, lineNumber, "Space in link target URL", line, null);
        }

        if (!inCodeBlock && pareninurl != null) {
            shared.addError(onError, lineNumber, "Paren in link target URL", line, null);
        }

        // if (!inCodeBlock && bracesnotparens != null) {
        //   shared.addError(onError, lineNumber, 'Using braces {} instead of parens ()', line, null)
        // }
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};