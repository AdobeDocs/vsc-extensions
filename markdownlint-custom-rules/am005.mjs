// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM005", "anchor-id-starts-with-number"];
export const description = "Anchor ids {#..} must begin with letter";
export const tags = ["anchors"];

export function function_(params, onError) {
    const codeBlockRe = new RegExp("```");
    var inCodeBlock = false;
    const idStartsWithNumberRe = new RegExp(".*?{#\\d+.*?}");

    shared.forEachLine(params, function forLine(line, lineIndex) {
        const lineNumber = lineIndex + 1;
        const codeBlockMatch = codeBlockRe.exec(line);
        const idStartsWithNumberMatch = idStartsWithNumberRe.exec(line);

        if (codeBlockMatch) {
            inCodeBlock = !inCodeBlock;
        }
        if (!inCodeBlock && idStartsWithNumberMatch) {
            shared.addErrorContext(onError, lineNumber, line);
        }
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};