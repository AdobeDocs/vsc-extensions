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

var blocktags_with_options = [
    'TAB',
    'BEGINSHADEBOX',
    'BEGINTABS'
];

var inlinetags = [
    'UICONTROL',
    'DNL',
    '__BETA_',
    'BADGE'
];

var alltags = blocktags.concat(inlinetags);

function containsAfmTag(line) {
    for (var i = 0, len = blocktags.length; i < len; i++) {
        if (line.includes('!' + blocktags[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Remove all HTML comments from an array of lines
 * Handles both single-line and multi-line comments while preserving line count
 * @param {string[]} lines - Array of lines to process
 * @returns {string[]} - Array of lines with HTML comments removed
 */
function stripHtmlComments(lines) {
    // Join all lines, remove all HTML comments (including multi-line), then split back
    var fullText = lines.join('\n');
    // Remove all HTML comments but replace with spaces and preserve newlines
    var cleaned = fullText.replace(/<!--[\s\S]*?-->/g, function(match) {
        // Count newlines in the comment and preserve them
        var newlineCount = (match.match(/\n/g) || []).length;
        return ' ' + '\n'.repeat(newlineCount);
    });
    return cleaned.split('\n');
}

export const names = ["AM009", "malformed-adobe-markdown-block"];
export const description = "adobe-markdown invalid";
export const tags = ["adobe-markdown", "adobe-markdown"];

export function function_(params, onError) {
    let codeFenceState = shared.createCodeFenceState();

    // Strip all HTML comments from all lines at once
    var cleanedLines = stripHtmlComments(params.lines);

    // Ensure cleanedLines has same length as params.lines
    if (cleanedLines.length !== params.lines.length) {
        console.error("AM009: cleanedLines length mismatch", cleanedLines.length, params.lines.length);
        return;
    }

    // check for stray AFM admonitions outside of blockquote or UICONTROL/DNL without brackets
    for (var i = 0; i < params.lines.length; i++) {
        if (i > 1) {
            var curline = params.lines[i];
            var prevline = params.lines[i - 1];
            var cleanCurline = cleanedLines[i];
            var cleanPrevline = cleanedLines[i - 1];
            var cleanPrevprevline = cleanedLines[i - 2];

            codeFenceState = shared.updateCodeFenceState(curline, codeFenceState);
            const incodeblock = codeFenceState.inCodeBlock;

            // console.log(i + 1, curline)
            if (!incodeblock) {
                if (
                    cleanPrevprevline.trim().startsWith('>') &&
                    !cleanPrevline.trim().startsWith('>') &&
                    cleanCurline.trim().startsWith('>') &&
                    !cleanCurline.includes('>[!') && cleanPrevline.trim() !== ''
                ) {
                    var warn = false;
                    // console.log(curline, curline.length)
                    if (warn) {
                        shared.addWarningContext(params.name, i + params.frontMatterLines.length, prevline, names[0] + '/' + names[1] + ' AFM (NOTE) block line missing ">"');
                    } else {
                        shared.addError(onError, i + 1, 'Missing > on AFM blockquote line - all lines in blockquote must start with >', prevline.trim());
                    }
                }
            }
        }
    }

    // check for admonitions in non-comment html block
    shared.filterTokens(params, 'html_block', function forToken(token) {
        var lines = token.content.split("\n");
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
        const raw = params.lines[startLine - 1] || "";

        // Check if this HTML block is a comment by examining the entire content
        const isComment = raw.trim().startsWith("<!--") || token.content.includes("<!--");

        if (!isComment) {
            lines.forEach(function forLine(line, lineNumber) {
                if (containsAfmTag(line)) {
                    shared.addError(onError, lineNumber + startLine, "AFM admonitions not supported in HTML blocks - use markdown blockquotes instead", line.trim());
                }
            });
        }
    });

    codeFenceState = shared.createCodeFenceState();
    shared.forEachLine(params, function forLine(line, lineIndex) {
        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const incodeblock = codeFenceState.inCodeBlock;

        if (!incodeblock) {
            var origline = line;
            // Use pre-cleaned line (comments already stripped)
            var cleanLine = cleanedLines[lineIndex];
            // Remove code spans
            cleanLine = cleanLine.replace(/`{1,3}.*?`{1,3}/g, ' <code> ');

            var linetags = cleanLine.match(/\[![^\[].*?\]/g) || [];

            if (linetags.length > 0) {
                for (var i = 0; i < linetags.length; i++) {
                    var tag = linetags[i].replace(/\[!(.*?)\]/, "$1").split(' ')[0];
                    if ((blocktags.includes(tag) || tag.startsWith('__BETA_')) && !cleanLine.match(/^\s*>/)) {
                        shared.addError(onError, lineIndex + 1, `Missing blockquote marker (>): use >[!${tag}] for AFM block tags`, origline);
                        continue;
                    }
                    if (!tag.startsWith('__BETA_') && !alltags.includes(tag) && !cleanLine.match(/^\s*>/)) {
                        shared.addError(onError, lineIndex + 1, `Unknown AFM tag [!${tag}] - check spelling or see list of valid tags`, origline);
                    }
                }
            }

            // lower case DNL or UICONTROL
            if (cleanLine.match(/\[\!uicontrol/) || cleanLine.match(/\[\!dnl/)) {
                shared.addError(onError, lineIndex + 1, 'AFM tags must be uppercase: use [!UICONTROL] or [!DNL]', origline);
            }

            // !DNL without brackets
            if (cleanLine.match(/[^\[]\!UICONTROL/) || cleanLine.match(/[^\[]\!DNL/)) {
                shared.addError(onError, lineIndex + 1, 'AFM tags must have brackets: use [!UICONTROL] or [!DNL]', origline);
            }

            // DNL with brackets, but no! [DNL foo]
            if (cleanLine.match(/[\[]UICONTROL/) || cleanLine.match(/[\[]DNL/)) {
                shared.addError(onError, lineIndex + 1, 'AFM tags must have exclamation mark: use [!UICONTROL] or [!DNL]', origline);
            }

            // DNL with brackets, but in linktext [!DNL foo](link)
            if (cleanLine.match(/\[!UICONTROL\s[^\]]*?\]\(/) || cleanLine.match(/\[!DNL\s[^\]]*?\]\(/)) {
                shared.addError(onError, lineIndex + 1, 'Cannot use [!UICONTROL] or [!DNL] as link text - they are inline formatting only', origline);
            }

            // UICONTROL with space [!UI CONTROL ...]
            if (cleanLine.match(/[\[]!UI\s+CONTROL/)) {
                shared.addError(onError, lineIndex + 1, 'Remove space: use [!UICONTROL] not [!UI CONTROL]', origline);
            }
        }
    });

    shared.filterTokens(params, "blockquote_open", function forToken(token) {
        const startIndex = Array.isArray(token.map) ? token.map[0] : ((token.lineNumber || 1) - 1);
        const rawLine = params.lines[startIndex];
        const cleanLine = cleanedLines[startIndex];
        var oline = Array.isArray(token.map) ? token.map[0] : startIndex;
        var cline = Array.isArray(token.map) ? token.map[1] : (oline + 1);

        // Skip blockquotes that were inside HTML comments (cleaned line won't have >)
        if (!cleanLine.includes('>')) {
            return;
        }

        var indent = cleanLine.indexOf('>');
        for (var i = oline; i < cline; i++) {
            // Skip lines that were inside a stripped multi-line HTML comment to prevent false positives.
            if (cleanedLines[i].trim() === '') continue;
            var lineindent = cleanedLines[i].indexOf('>');
            if (lineindent != indent) {
                if (lineindent < 0) {
                    shared.addError(onError, i + 1, `Missing blockquote marker (>) or unexpected newline - expected indent: ${indent}, found: ${lineindent}`, params.lines[i]);
                } else {
                    shared.addError(onError, i + 1, `Mismatched indent for blockquote - expected: ${indent}, found: ${lineindent}`, params.lines[i]);
                }
            }
        }
        // console.log(token)
        // console.log(token.lineNumber + params.frontMatterLines.length)
        // console.log(token.line)
        // console.log(indent)
        if (cleanLine.indexOf('[!') > 0) {  // is it AFM component

            // TODO: split the tag out here
            var afmtag = cleanLine.split(/[\[\]]/)[1];

            if (afmtag.includes("!") && !blocktags.includes(afmtag.replace("!", "")) && afmtag != "!VIDEO" && afmtag != "!SLIDE" && !afmtag.startsWith('!__BETA')) {
                if (afmtag.split(' ').length > 1 && blocktags_with_options.includes(afmtag.split(' ')[0].replace('!', ''))) {
                    //good
                } else {
                    shared.addError(onError, startIndex + 1, `Unknown blockquote AFM tag [${afmtag}] - check spelling or see list of valid block tags`, rawLine);
                }
            }
            if (cleanLine.match(/[\>]*\s+\[!/)) {
                shared.addError(onError, startIndex + 1, 'Remove space between > and [! in blockquote admonition', rawLine);
            }
            var trimmed = cleanLine.trim().replace(/\].*$/, ']');

            if (cleanLine.trim() != trimmed && cleanLine.indexOf('[!VIDEO]') <= 0 && cleanLine.indexOf('[!SLIDE]') <= 0) {
                // check for content after end of the container declaration
                shared.addError(onError, startIndex + 1, 'Remove content after ] - AFM block tags must be on their own line', rawLine);
            }

            // if (token.line.indexOf('[!VIDEO]') > 0) {
            //     // check for content after the video link
            //     trimmed = token.line.trim().replace(/\).*$/, ')')
            //     if (token.line.trim() != trimmed) {
            //         shared.addErrorContext(onError, token.lineNumber, token.line);
            //     }
            // }
        } else {
            var afmtag = cleanLine.split(/[\[\]]/)[1];

            // check for afm blocks without ! eg,  >[NOTE]
            for (var i = 0, len = blocktags.length; i < len; i++) {
                var repattern = "[\\s]*>\\s*\\[" + blocktags[i] + "\\s*\\]";
                var re = new RegExp(repattern);
                if (cleanLine.match(re) != null) {
                    shared.addError(onError, startIndex + 1, `AFM block tag missing !: use >[!${blocktags[i]}] not >[${blocktags[i]}]`, rawLine);
                }
            }
            // check for afm blocks with extra text ! eg,  >[NOTE]
            for (var i = 0, len = blocktags.length; i < len; i++) {
                var nobang_pattern = "[\\s]*>\\s*\\[\!" + blocktags[i] + "\\s*\\]";
                var textafterafm_pattern = "[\\s]*>\\s*\\[\!" + blocktags[i] + "\\s*\\]";
                var re = new RegExp(repattern);
                if (cleanLine.match(re) != null) {
                    // shared.addErrorContext(onError, token.startLine, cleanLine);
                }
            }
            /*
                !AFM
                AFM
            */
            // check for inline tags and block tags without ! eg,  [DNL blah]
            for (var i = 0, len = alltags.length; i < len; i++) {
                var repattern = "[\\s]*\\s*\\[" + alltags[i] + ".*?\\]";
                var re = new RegExp(repattern);
                if (cleanLine.match(re) != null) {
                    shared.addError(onError, startIndex + 1, `AFM tag missing !: use [!${alltags[i]}] not [${alltags[i]}]`, rawLine);
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