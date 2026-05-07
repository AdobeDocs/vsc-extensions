// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM029", "git-merge-conflict-lines"];
export const description = "Markdown source contains git merge conflict lines";
export const tags = ["warnings", "git-merge-conflict"];

export function function_(params, onError) {
    const codeBlockRe = new RegExp("```");
    let codeFenceState = shared.createCodeFenceState();
    var isWarning = true;

    shared.forEachLine(params, function forLine(line, lineIndex) {
        line = line.replace(/`{1}[^`].*?`{1}/, "CODE");
        const lineNumber = lineIndex + 1;
        const prevInCodeBlock = codeFenceState.inCodeBlock;
        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const inCodeBlock = codeFenceState.inCodeBlock;
        if (!inCodeBlock && !prevInCodeBlock) {
            if (line.startsWith("<<<<<<< HEAD")) {
                shared.addErrorContext(onError, lineNumber, line);
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