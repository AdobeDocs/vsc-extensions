// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

/**
 * True if a later line closes the current fence the same way `updateCodeFenceState` would.
 * Used when a 1–2 backtick line looks like a bad fence: keep the block open only if a real
 * ``` close still follows; otherwise the rule recovers by leaving the block so the rest of the
 * file is not swallowed as code content.
 */
function hasClosingTripleBacktickAhead(lines, startIndex, codeFenceState) {
    let state = { ...codeFenceState };
    for (let j = startIndex + 1; j < lines.length; j++) {
        let line = lines[j];
        line = line.replace(">", " ");
        line = line.replace(/```.*?```/, "reg");
        line = line.replace(/^[\s]*\\[\s]*$/, "");
        const wasIn = state.inCodeBlock;
        const nextState = shared.updateCodeFenceState(line, state);
        if (wasIn && !nextState.inCodeBlock) {
            return true;
        }
        state = nextState;
    }
    return false;
}

export const names = ["AM012", "code-block-indent-and-fence"];
export const description = "Code block syntax";
export const tags = ["code", "indent_level"];

export function function_(params, onError) {
    const lines = params.lines;
    let openFenceIndent = -1;
    let codeFenceState = {
        inCodeBlock: false,
        fenceChar: null,
        fenceCount: 0
    };
    let inTildeFence = false;
    let lastFenceLine = -1;
    let codeblockcount = 0;

    shared.forEachLine(params, function forLine(line, i) {
        const oldline = line;
        const inCode = codeFenceState.inCodeBlock;

        if (/^[\s]*~{3,}/.test(line) && !inCode) {
            if (!inTildeFence) {
                shared.addError(
                    onError,
                    i + 1,
                    "Code blocks must use backticks (```), not tildes (~~~).",
                    oldline.trim()
                );
                inTildeFence = true;
            } else {
                inTildeFence = false;
            }
            return;
        }

        if (inTildeFence) {
            return;
        }

        line = line.replace(">", " "); // remove blockquotes
        line = line.replace(/```.*?```/, "reg"); // remove inline code
        line = line.replace(/^[\s]*\\[\s]*$/, ""); // remove backslashes from shared.clearHtmlCommentText()

        const lineindent = line.search(/\S|$/);
        const fenceindent = line.search("```");
        const inlinehits = line.match(/```.*```/g);
        const inline = inlinehits != null && inlinehits.length > 0;

        // Detect malformed closing fence (1-2 backticks) when inside backtick code block
        if (
            inCode &&
            codeFenceState.fenceChar === '`' &&
            !inline &&
            lineindent === openFenceIndent
        ) {
            const malformedFenceMatch = line.match(/^[\s]*(?:>\s*)*`{1,2}[\s]*$/);
            if (malformedFenceMatch) {
                const found = malformedFenceMatch[0].trim().length;
                shared.addError(
                    onError,
                    i + 1,
                    `Code block closing fence must use at least 3 backticks; found ${found}.`,
                    oldline.trim()
                );
                if (!hasClosingTripleBacktickAhead(lines, i, codeFenceState)) {
                    codeFenceState = {
                        inCodeBlock: false,
                        fenceChar: null,
                        fenceCount: 0
                    };
                }
                return;
            }
        }

        const prevInCode = inCode;
        const nextFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const nextInCode = nextFenceState.inCodeBlock;

        if (
            fenceindent >= 0 &&
            !inline &&
            line.trim().search("```") === 0 // fence starts the line
        ) {
            codeblockcount++;
            if (prevInCode && !nextInCode) {
                if (openFenceIndent !== fenceindent) {
                    shared.addError(
                        onError,
                        i + 1,
                        `Closing fence indent (${fenceindent}) must match opening fence indent (${openFenceIndent}).`,
                        lines[i].trim()
                    );
                }
                codeFenceState = nextFenceState;
            } else if (!prevInCode && nextInCode) {
                codeFenceState = nextFenceState;
                openFenceIndent = fenceindent;
                lastFenceLine = i;
            } else {
                codeFenceState = nextFenceState;
            }
        } else {
            codeFenceState = nextFenceState;
            if (prevInCode) {
                if (lineindent < openFenceIndent && line.trim().length) {
                    shared.addError(
                        onError,
                        i + 1,
                        `Content indent (${lineindent}) is less than code block indent (${openFenceIndent}).`,
                        lines[i].trim()
                    );
                }
            }
            if (prevInCode && line.match(/\s*```/) && line.search("```") >= 0) {
                if (line.length > 0 && lineindent < openFenceIndent) {
                    shared.addError(
                        onError,
                        i + 1,
                        `Fence indent (${lineindent}) is less than opening fence indent (${openFenceIndent}).`,
                        lines[i].trim()
                    );
                }
            }
        }
    });

    if (codeFenceState.inCodeBlock) {
        shared.addError(
            onError,
            lastFenceLine + 1,
            `Unclosed code block. No matching closing fence found.`,
            lines[lastFenceLine].trim()
        );
    }
}

export default {
    names,
    description,
    tags,
    function: function_,
};