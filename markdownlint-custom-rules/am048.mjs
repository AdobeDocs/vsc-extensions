// @ts-check

"use strict";

import { addError, filterTokens } from "./custom-shared.mjs";

export const names = ["AM048", "image-count-limit"];
export const description = "Limit images per article to maximum of 190";
export const tags = ["image-limit", "performance"];

export function function_(/** @type {any} */ params, /** @type {any} */ onError) {
  const imageThreshold = 190;
  let imageCount = 0;

  filterTokens(params, "inline", (/** @type {any} */ token) => {
    if (token.children) {
      token.children.forEach((/** @type {any} */ child) => {
        if (child.type === "image") {
          // Markdown images
          imageCount++;
        } else if (child.type === "html_inline") {
          // HTML images
          const htmlImagePattern = /<img\b[^>]*>/gi;
          const htmlMatches = child.content.match(htmlImagePattern);
          if (htmlMatches) {
            imageCount += htmlMatches.length;
          }
        }
      });
    }
  });

  if (imageCount > imageThreshold) {
    addError(
      onError,
      1,
      `images: ${imageCount} — maximum allowed: ${imageThreshold}`
    );
  }
}

export default {
  names,
  description,
  tags,
  function: function_,
};