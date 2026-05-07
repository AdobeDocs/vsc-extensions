// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

// > [!NOTE]
// should be
// >[!NOTE]

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
    'PREREQUISITES'
];

var inlinetags = [
    'UICONTROL',
    'DNL'
];

var alltags = blocktags.concat(inlinetags);

function containsAfmTag(line) {
    var foundtag = false;
    for (var i = 0, len = blocktags.length; i < len; i++) {
        var tags = line.match('!' + blocktags[i]);
        if (!foundtag) {
            if (tags != null) {
                foundtag = true;
            } else {
                foundtag = false;
            }
        }
    }
    return foundtag;
}

export const names = ["AM021", "youtube-video", "mp4-video"];
export const description = "YouTube and mp4 videos are not supported";
export const tags = ["adobe-markdown", "adobe-markdown"];

export function function_(params, onError) {
    var incodeblock = false;

    shared.filterTokens(params, "blockquote_open", (token) => {
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
        const rawLine = params.lines[startLine - 1] || "";
        if (rawLine.indexOf('[!') > 0) {  // is it AFM component
            // TODO: split the tag out here
            if (rawLine.indexOf('[!VIDEO]') > 0) {
                // check for content after the video link
                if (
                    rawLine.includes("youtube.com") ||
                    rawLine.includes("youtu.be") ||
                    rawLine.includes(".mp4)")
                ) {
                    shared.addErrorContext(onError, startLine, rawLine);
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