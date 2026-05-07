// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM015", "malformed-html-comment"];
export const description = "HTML comment malformed";
export const tags = ["html", "comment"];

export function function_(params, onError) {
    // console.log("AM015: ", arguments);
    // console.log("AM015: ", params);
    const lines = params.lines;
    // console.log("AM015: Got past params usage");

    let codeFenceState = shared.createCodeFenceState();

    var htmlOpen = -1;

    // console.log("AM015: Starting checking");
    // console.log(shared);

    shared.forEachLine(params, function forLine(line, i) {
        line = line.replace(/`[^`].*`/, "");

        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const inCodeBlock = codeFenceState.inCodeBlock;

        if (!inCodeBlock && line.search(/<![-]*[>]+/) >= 0) {
            shared.addErrorContext(onError, i + 1, lines[i].trim());
        }
    });

    codeFenceState = shared.createCodeFenceState();
    shared.forEachLine(params, function forLine(line, i) {
        line = line.replace(/`[^`].*`/, "");
        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const inCodeBlock = codeFenceState.inCodeBlock;

        if (!inCodeBlock) {
            if (line.search(/<![-][-]*/) >= 0) {
                // console.log('html comment open ' + (i+1+fmlen).toString())
                htmlOpen = i + 1;
            }
            if (line.search(/[-][-]*>/) >= 0) {
                // console.log('html comment close ' + (i+1+fmlen).toString())
                htmlOpen = -1;
            }
        }
    });

    // console.log("AM015: Past checking");

    if (htmlOpen !== -1) {
        shared.addErrorDetailIf(onError, htmlOpen, null, "Unclosed HTML comment", null);
    }
}

export default {
    names,
    description,
    tags,
    function: function_,
};