// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM051", "heading-in-steps"];
export const description = "Headings cannot be in steps; headings must start at the beginning of the line";
export const tags = ["headings", "steps"];

// Matches steps containing a heading; does not match anchors;
// The steps can begin with +, -, *, or a number like 1. or 1) and they
// can be indented (tho in that case MD023 would be triggered first anyway);
// And only one space is allowed between hashes and text in the heading, as per MD018/MD019
const heading_in_step_regex = /^\s*(?:[*+-]|\d+[.)])\s+#{1,6} .+$/;

export function function_(params, onError) {
    shared.forEachLine(params, (line, i) => {

        if (heading_in_step_regex.test(line)) {
            shared.addErrorContext(onError, i + 1, line);
        }
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};
