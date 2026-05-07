// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM026", "table-indent"];
export const description = "Table must use consistent indent level";
export const tags = ["tables"];

export function function_(params, onError) {
    shared.filterTokens(params, "table_open", (token) => {
        // remove whitespace and > if it's a note block
        var indent = (params.lines[(Array.isArray(token.map)? token.map[0] : ((token.lineNumber||1)-1))] || '').replace(/^>/, '').search(/\S/);
        var begin = token.map[0];
        var end = token.map[1];
        var beginWithFM = begin + params.frontMatterLines.length + 1;
        var endWithFM = end + params.frontMatterLines.length;

        params.lines.forEach(function forLine(line, lineIndex) {
            // remove whitespace and > if it's a note block
            line = line.replace(/^>/, '');
            var lineIndexWithFM = lineIndex + params.frontMatterLines.length + 1;
            if (lineIndexWithFM >= beginWithFM && lineIndexWithFM <= endWithFM) {
                var lineIndent = line.search(/\S/);
                if (line !== '') {
                    if (lineIndent !== indent) {
                        shared.addError(onError, lineIndex + 1, 'Excpected ' + indent + ', found ' + lineIndent);
                    }
                }
            }
        });
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};