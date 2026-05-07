// @ts-check

"use strict";

import { forEachHeading, addErrorContext } from "./custom-shared.mjs";

// console.log("AM001 loaded");

export const names = ["AM001", "heading-title-starts-with-numbers"];
export const description = "Headings cannot contain numbers without named anchor {#..}";
export const tags = ["headings", "headers"];

export function function_(params, onError) {
    // console.log("AM001 running on", params.name);
    let prevLevel = 0;
    forEachHeading(params, function forHeading(token, heading_title) {
        const startLine = Array.isArray(token.map) ? (token.map[0] + 1) : ((token.lineNumber || 1));
        const raw_line = params.lines[startLine - 1] || "";

        if (heading_title.match(/^\d+/) && !heading_title.match(/\{\#.*?\}$/)) {
            addErrorContext(onError, startLine, raw_line);
        }
        // if (heading_title.match(/.*?{#\d+.*?}/)) {
        //   shared.addErrorContext(onError, token.lineNumber, token.line);
        // }
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};