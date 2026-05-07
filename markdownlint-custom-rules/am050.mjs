// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM050", "malformed-accordion"];
export const description = "Accordion block has unmatched borders";
export const tags = ["accordion"];

export function function_(params, onError) {
    const lines = params.lines;
  let codeFenceState = shared.createCodeFenceState();
    let openStack = [];

    shared.forEachLine(params, (line, i) => {
        const lineNumber = i + 1;

    codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
    const inCodeBlock = codeFenceState.inCodeBlock;
        if (inCodeBlock) return;

        const lineWithoutInline = line.replace(/`[^`]*`/g, "");

        // +++SomeText (leading and trailing spaces allowed and also
        // the spaces between +++ and SomeText are allowed)
        const isOpening = /^\s*\+{3}(?:\s*\S)/.test(lineWithoutInline);

        // +++ (leading and trailing spaces allowed)
        const isClosing = !isOpening && /^\s*\+{3}\s*$/.test(lineWithoutInline);

        if (isOpening) {
            // Allow nesting, push this opening line onto the stack
            openStack.push(lineNumber);

        } else if (isClosing) {
            if (openStack.length === 0) {
                // Closing without any matching opening
                shared.addErrorDetailIf(onError, lineNumber, null,
                    "Unmatched accordion border (closing without opening)", null);
            } else {
                // Match and close the innermost still-open accordion
                openStack.pop();
            }
        }
    });

    // Any openings left on the stack are unmatched
    if (openStack.length > 0) {
        for (const openLine of openStack) {
            shared.addErrorDetailIf(onError, openLine, null,
                "Unmatched accordion border (opening without closing)", null);
        }
    }
}

export default {
    names,
    description,
    tags,
    function: function_,
};
