// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM033", "invalid-code-block-language"];
export const description = "Invalid language identifier for code block";
export const tags = ["code"];

export function function_(params, onError) {
    const lines = params.lines;
    let codeFenceState = shared.createCodeFenceState();

    shared.forEachLine(params, function forLine(line, i) {
        const prevInCodeBlock = codeFenceState.inCodeBlock;
        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const inCodeBlock = codeFenceState.inCodeBlock;
        if (!prevInCodeBlock && inCodeBlock && line.startsWith("```")) {
            var language = line.match(/```([a-zA-Z0-9_+.-]+)/)?.[1];
            if (language) {
                if (!shared.codeBlockLanguages.includes(language)) {
                    shared.addErrorContext(onError, i + 1, lines[i].trim());
                }
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