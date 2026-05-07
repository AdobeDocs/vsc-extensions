// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM057", "landing-cards-container-card-structure"];
export const description =
  "Validates that every :::card inside a landing-cards-container has a matching ::: closing tag";
export const tags = ["cards", "directives"];

// Matches the ::::landing-cards-container opening line (4+ colons)
const OUTER_OPEN_RE = /^:{4,}\s*landing-cards-container\s*$/;
// Matches the :::: outer closing line (4+ colons, nothing else)
const OUTER_CLOSE_RE = /^:{4,}\s*$/;
// Matches a :::card opening — with or without a space before "card"
const CARD_OPEN_RE = /^:::\s*card\s*$/;
// Matches a plain ::: closing (exactly 3 colons, nothing else)
const CARD_CLOSE_RE = /^:::\s*$/;

export function function_(params, onError) {
  let codeFenceState = shared.createCodeFenceState();
  let inContainer = false;
  let pendingCardLine = null; // line number of the last unclosed :::card

  shared.forEachLine(params, (line, i) => {
    const lineNumber = i + 1;
    const trimmed = line.trim();

    codeFenceState = shared.updateCodeFenceState(trimmed, codeFenceState);
    const inCodeBlock = codeFenceState.inCodeBlock;
    if (inCodeBlock) return;

    if (!inContainer) {
      if (OUTER_OPEN_RE.test(trimmed)) {
        inContainer = true;
        pendingCardLine = null;
      }
      return;
    }

    // Inside a landing-cards-container block
    if (OUTER_CLOSE_RE.test(trimmed)) {
      if (pendingCardLine !== null) {
        shared.addError(
          onError,
          pendingCardLine,
          `Unclosed :::card directive (opened at line ${pendingCardLine}, missing closing :::)`
        );
      }
      inContainer = false;
      pendingCardLine = null;
      return;
    }

    if (CARD_OPEN_RE.test(trimmed)) {
      if (pendingCardLine !== null) {
        shared.addError(
          onError,
          pendingCardLine,
          `Unclosed :::card directive (opened at line ${pendingCardLine}, missing closing :::)`
        );
      }
      pendingCardLine = lineNumber;
      return;
    }

    if (CARD_CLOSE_RE.test(trimmed)) {
      pendingCardLine = null;
    }
  });
}

export default {
  names,
  description,
  tags,
  function: function_,
};
