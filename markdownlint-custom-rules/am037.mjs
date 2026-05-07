// @ts-check

"use strict";

import { parseSlideshow } from "./slideshow-parser.mjs";

export const names = ["AM037", "slide-missing-image"];
export const description = "Each slide must contain at least one image";
export const tags = ["slides"];

export function function_(params, onError) {
    const slideshow = parseSlideshow(params);

    // Check each slide for required image (only if we have a complete slideshow)
    if (slideshow.slideshowActive && slideshow.slideshowClosed) {
        for (const slide of slideshow.slides) {
            let hasImage = false;
            for (const line of slide.lines) {
                if (line.images && line.images.length > 0) {
                    hasImage = true;
                    break;
                }
            }
            if (!hasImage) {
                onError({
                    lineNumber: slide.startLine,
                    detail: "Slide does not contain an image",
                });
            }
        }
    }
}

export default {
  names,
  description,
  tags,
  function: function_,
};
