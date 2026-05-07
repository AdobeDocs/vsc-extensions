// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM014", "code-block-language-has-curly-braces"];
export const description = "Language identifier for code-blocks should not contain braces";
export const tags = ["code", "indent_level"];

export function function_(params, onError) {
    const lines = params.lines;
    var openFenceIndent = -1;
    var inCode = false;
    var lastFenceLine = -1;

    shared.forEachLine(params, function forLine(line, i) {
        line = line.replace(">", " "); // get rid of blockquotes
        line = line.replace(/```.*?```/g, "reg");

        if (line.match(/```.*\{/)) {
            // shared.addErrorContext(onError, i+1, lines[i].trim())
        }

        // var lineindent = line.search(/\S|$/)
        // var fenceindent = line.search('```')
        // var inline = false
        // if (line.search('````') >= 0) {
        //     shared.addErrorContext(onError, i+1, lines[i].trim())
        // }
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};