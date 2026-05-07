// @ts-check

"use strict";

import { parseSlideshow } from "./slideshow-parser.mjs";

export const names = ["AM038", "slide-text-too-long"];
export const description = "Text section of slide exceeds 1000 word limit";
export const tags = ["slides"];

export function function_(params, onError) {
    const slideshow = parseSlideshow(params);

    // Check each slide for word count limit (only if we have a complete slideshow)
    if (slideshow.slideshowActive && slideshow.slideshowClosed) {
        for (const slide of slideshow.slides) {
            let wordCount = 0;
            for (const line of slide.lines) {
                // Count words only for text content (excluding headings, images, and callouts)
                if (line.type === "text") {
                    const words = line.text.trim().split(/\s+/).filter(Boolean);
                    wordCount += words.length;
                }
            }
            if (wordCount > 1000) {
                onError({
                    lineNumber: slide.startLine,
                    detail: `Slide text contains ${wordCount} words (limit is 1000)`,
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
