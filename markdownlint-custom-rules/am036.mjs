// @ts-check

"use strict";

import { parseSlideshow } from "./slideshow-parser.mjs";

export const names = ["AM036", "slide-minimum-count"];
export const description = "Slideshow must have at least 2 slides";
export const tags = ["slides"];

export async function function_(params, onError) {
    const slideshow = parseSlideshow(params);

    // Check minimum slide count (only if we have a complete slideshow)
    if (slideshow.slideshowActive && slideshow.slideshowClosed) {
        if (slideshow.slideCount < 2) {
            onError({
                lineNumber: slideshow.startLine,
                detail: `Slideshow has only ${slideshow.slideCount} slide(s); must have at least 2`,
            });
        }
    }
}

export default {
    names,
    description,
    tags,
    function: function_,
};
