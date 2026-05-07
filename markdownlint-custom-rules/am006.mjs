// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM006", "dodgy-characters"];
export const description = "Detects invisible dodgy-characters and control characters";
export const tags = ["dodgy-character"];

export function function_(params, onError) {
    // const dodgy = new RegExp("[\xA0\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+(.+)[\xA0\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+(.+)";
    shared.forEachLine(params, function forLine(line, lineIndex) {
        const lineNumber = lineIndex + 1;
        if (line.match(/[\x00-\x08\x0A-\x0F]/)) {
            shared.addErrorContext(onError, lineNumber, line);
        }
    });
}

export default {
  names,
  description,
  tags,
  function: function_,
};