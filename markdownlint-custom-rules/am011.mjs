// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM011", "link-syntax1"];
export const description = "Spaces between link components or in url";
export const tags = ["warnings", "link"];

export function function_(params, onError) {
    const spaceinlinkRe = new RegExp("\\[[^!].*?\\]\\s+\\(");
    const spaceinurlRe = new RegExp("\\[[^!].*?\\]\\(\\s+.*?\\)");
    let codeFenceState = shared.createCodeFenceState();
    let isWarning = true;

    shared.forEachLine(params, function forLine(line, lineIndex) {
        line = line.replace(/`{1}[^`].*?`{1}/, "CODE");
        const lineNumber = lineIndex + 1;
        const spaceinlink = line.match(spaceinlinkRe);
        const spaceinurl = line.match(spaceinurlRe);
        const prevInCodeBlock = codeFenceState.inCodeBlock;
        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const inCodeBlock = codeFenceState.inCodeBlock;

        if (!inCodeBlock && !prevInCodeBlock && (spaceinlink || spaceinurl)) {
            if (isWarning && !spaceinurl) {
                shared.addWarningContext(
                    params.name,
                    lineNumber + params.frontMatterLines.length,
                    line,
                    `${names[0]}/${names[1]} ${description}`
                );
            } else {
                shared.addErrorContext(onError, lineNumber, line);
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