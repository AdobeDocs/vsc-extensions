// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

var blocktags = [
    'NOTE',
    'TIP',
    'IMPORTANT',
    'WARNING',
    'CAUTION',
    'VIDEO',
    'MORELIKETHIS',
    'CONTEXTUALHELP',
    'ADMIN',
    'AVAILABILITY',
    'PREREQUISITES',
    'Related Articles',
    'ERROR',
    'SUCCESS',
    'INFO',
    '__BETA_',
    'TAB',
    'BEGINSHADEBOX',
    'ENDSHADEBOX',
    'BEGINTABS',
    'ENDTABS',
    'SLIDE'
];

export const names = ["AM052", "indented-admonition"];
export const description = "AFM admonitions must not be indented unless inside lists";
export const tags = ["adobe-markdown", "layout"];

export function function_(params, onError) {
    let codeFenceState = shared.createCodeFenceState();
    var prevNonBlankWasList = false;
    var prevNonBlankIndent = 0;

    shared.forEachLine(params, function forLine(line, lineIndex) {
        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const incodeblock = codeFenceState.inCodeBlock;
        if (incodeblock) return;

        const raw = line;
        const leadingWs = (raw.match(/^([ \t]*)/) || ["", ""])[1];
        const indentLen = leadingWs.length;

        // Track if the line is inside a list
        if (raw.trim() !== "") {
            const isListLine = /^\s*(?:[-*+]|\d+[.)])\s+/.test(raw);
            if (isListLine) {
                prevNonBlankWasList = true;
                prevNonBlankIndent = indentLen;
            } else {
                prevNonBlankWasList = prevNonBlankWasList && indentLen > prevNonBlankIndent;
            }
        }

        // Match leading indentation
        const indentMatch = raw.match(/^([ \t]+)/);
        if (!indentMatch) return;

        const afterIndent = raw.slice(indentMatch[1].length);

        // Must start with an AFM admonition
        const afmMatch = afterIndent.match(/^(?:>\s*)?\[!([^\]]+)\]/);

        if (!afmMatch) return;

        const tag = afmMatch[1].trim();
        if (!blocktags.includes(tag) && !tag.startsWith('__BETA_')) {
            return;
        }

        // Allow if this is a list marker line OR a continuation line inside a list item
        if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(raw) || prevNonBlankWasList) {
            return;
        }

        shared.addError(
            onError,
            lineIndex + 1,
            "Indented AFM admonition renders as code block",
            raw
        );
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};