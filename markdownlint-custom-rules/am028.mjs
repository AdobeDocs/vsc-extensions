// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM028", "empty-admonition-block"];
export const description = "Admonition has blank line or no content";
export const tags = ["blockquote", "whitespace"];

var blocktags = [
    'NOTE',
    'TIP',
    'IMPORTANT',
    'WARNING',
    'CAUTION',
    'MORELIKETHIS',
    'CONTEXTUALHELP',
    'ADMIN',
    'AVAILABILITY',
    'PREREQUISITES',
    'Related Articles',
    'ERROR',
    'SUCCESS',
    'INFO',
    '__BETA_ACCORDIAN',
    '__BETA_TAB',
    'BEGINSHADEBOX',
    'ENDSHADEBOX',
    'TABS',
    'TAB',
    'SLIDE'
];

var singleLineBlocktags = [
    'VIDEO',
    'SLIDE',
    '__BETA',
    'BEGINTABS',
    'ENDTABS',
    'TAB',
    'BEGINSHADEBOX',
    'ENDSHADEBOX'
];

function containsAfmTag(line) {
    // Check if line contains any valid AFM block tag with ! prefix
    for (var i = 0, len = blocktags.length; i < len; i++) {
        if (line.includes('!' + blocktags[i])) {
            return true;
        }
    }
    return false;
}

function containsSingleLineAfmTag(line) {
    for (var i = 0, len = singleLineBlocktags.length; i < len; i++) {
        if (line.includes('!' + singleLineBlocktags[i])) {
            return true;
        }
    }
    return false;
}

export function function_(params, onError) {
    shared.filterTokens(params, "blockquote_open", (token) => {
        const line = params.lines[token.lineNumber - 1];
        if (containsAfmTag(line)) {
            var admonitionContentLength = 0;
            var numlines = token.map[1] - token.map[0];
            if (numlines < 2 && !containsSingleLineAfmTag(line)) {
                shared.addError(onError, token.lineNumber);
            } else if (!containsSingleLineAfmTag(line)) {
                for (let i = token.map[0] + 1; i < token.map[1]; i++) {
                    var contentLine = params.lines[i].replace(/[\s]*>/, '').trim();
                    admonitionContentLength = admonitionContentLength + contentLine.length;
                }
                if (admonitionContentLength === 0) {
                    shared.addError(onError, token.lineNumber);
                }
            }
        }
    });

    // check for blank lines in non-afm block quote
    let prevToken = {};
    for (const token of params.tokens) {
        if (
            (token.type === "blockquote_open") &&
            (prevToken.type === "blockquote_close") &&
            !containsAfmTag(params.lines[token.lineNumber - 1]) &&
            !containsSingleLineAfmTag(params.lines[token.lineNumber - 1])
        ) {
            shared.addError(onError, token.lineNumber - 1);
        }
        prevToken = token;
    }
}

export default {
    names,
    description,
    tags,
    function: function_,
};