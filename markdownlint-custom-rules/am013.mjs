// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM013", "code-block-fence-too-many-ticks"];
export const description = "Code blocks should have only three ticks";
export const tags = ["code", "indent_level"];

export function function_(params, onError) {
    const lines = params.lines;
    var openFenceIndent = -1;
    var inCode = false;
    var lastFenceLine = -1;

    shared.forEachLine(params, function forLine(line, i) {
        line = line.replace(">", " "); // get rid of blockquotes
        line = line.replace(/```.*?```/, "reg");

        var lineindent = line.search(/\S|$/);
        var fenceindent = line.search("```");
        var inline = false;
        if (line.search("````") >= 0) {
            shared.addErrorContext(onError, i + 1, lines[i].trim());
        }
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};