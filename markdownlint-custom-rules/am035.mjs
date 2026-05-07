// @ts-check

"use strict";
// TODO What if the MD rules which we are disabling are different now?
// TODO I think there is another file denoting which rules we should disable; check what I sent to Joe
import * as shared from "./custom-shared.mjs";

export const names = ["AM035", "images-in-bold-or-italic-blocks"];
export const description = "Images should not be enclosed by bold or italic blocks.";
export const tags = ["images"];

export function function_(params, onError) {
    shared.forEachLine(params, function forLine(line, i) {
        if (line.match(/(\*\*|_)(.*?)!\[[^\]]*\]\[[^\]]+\](.*?)\1/g)) {
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