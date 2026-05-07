// @ts-check

"use strict";

import fs from "fs";
import * as shared from "./custom-shared.mjs";

export const names = ["AM054", "html-comment-format"];
export const description =
  "HTML comment format: delimiters must be consistently inline or own-line; one inline comment per line; own-line multi-line bodies must not outdent past the opener";
export const tags = ["html", "comment"];

const MIXED_STYLE_MSG =
  "Mixed comment style: use either inline (<!-- ... --> on one line) or own-line (<!-- and --> each on their own line)";
const MULTIPLE_INLINE_MSG =
  "Multiple inline comments on one line: use one comment per line or switch to own-line style";
const CROSSES_ADMONITION_MSG =
  "Comment crosses admonition boundary: <!-- and --> must be at the same block quote level";
const BODY_OUTDENT_MSG =
  "HTML comment body is outdented relative to <!--; indent this line to match the opening comment or move content inside the comment block.";
const BODY_BQ_MSG =
  "HTML comment body line must use the same block quote prefix (>) count as the opening <!-- line.";

/**
 * Check if a delimiter is alone on its line (only whitespace and blockquote
 * markers surround it).  Uses the RAW file line because markdownlint masks
 * content inside HTML comments with "." in params.lines.
 */
function isOwnLine(rawLine, delimiter) {
  return rawLine.replace(delimiter, "").replace(/[>\s]/g, "").length === 0;
}

/**
 * Count leading blockquote markers (">") in a raw line.
 */
function blockquoteLevel(rawLine) {
  let level = 0;
  for (const ch of rawLine.trimStart()) {
    if (ch === ">") level++;
    else if (ch !== " ") break;
  }
  return level;
}

/**
 * 0-based column of the first non-space / non-tab character.
 */
function firstNonWsColumn(rawLine) {
  let i = 0;
  while (i < rawLine.length && (rawLine[i] === " " || rawLine[i] === "\t")) i++;
  return i;
}

/**
 * Column index of the first content character after `bqLevel` nested `>` markers
 * (each `>` may be followed by an optional space, e.g. `> body`). Returns -1 if
 * the prefix doesn't match.
 */
function columnAfterBlockquotePrefix(rawLine, bqLevel) {
  let i = 0;
  const len = rawLine.length;
  for (let q = 0; q < bqLevel; q++) {
    while (i < len && (rawLine[i] === " " || rawLine[i] === "\t")) i++;
    if (i >= len || rawLine[i] !== ">") return -1;
    i++;
    if (i < len && rawLine[i] === " ") i++;
  }
  while (i < len && (rawLine[i] === " " || rawLine[i] === "\t")) i++;
  return i;
}

/**
 * Treat truly-empty lines and blockquote-only "blank" lines (e.g. `>` / `> `)
 * as blank for body-indent checks.
 */
function isBlankCommentBodyLine(rawLine, bqLevel) {
  if (!rawLine.trim()) return true;
  if (bqLevel === 0) return false;
  const col = columnAfterBlockquotePrefix(rawLine, bqLevel);
  if (col < 0) return false;
  return rawLine.slice(col).trim() === "";
}

/**
 * Validate one body line of an own-line multi-line comment. Skipped for inline
 * openers, lines inside fenced code blocks, the opener line itself, and blanks.
 */
function validateOwnLineCommentBody(rawLine, openComment, onError, lineNumber, contextLine, inCodeBlock) {
  if (!openComment.isOwnLine || openComment.baseColumn < 0 || inCodeBlock) return;
  if (lineNumber <= openComment.lineNumber) return;
  if (isBlankCommentBodyLine(rawLine, openComment.bqLevel)) return;

  const base = openComment.baseColumn;
  const bq = openComment.bqLevel;

  if (bq > 0) {
    const bodyBq = blockquoteLevel(rawLine);
    if (bodyBq !== bq) {
      shared.addError(onError, lineNumber, BODY_BQ_MSG, contextLine);
      return;
    }
    const contentCol = columnAfterBlockquotePrefix(rawLine, bq);
    if (contentCol >= 0 && contentCol < base) {
      shared.addError(onError, lineNumber, BODY_OUTDENT_MSG, contextLine);
    }
    return;
  }

  if (firstNonWsColumn(rawLine) < base) {
    shared.addError(onError, lineNumber, BODY_OUTDENT_MSG, contextLine);
  }
}

export function function_(params, onError) {
  // Read the raw file so we can inspect unmasked lines.
  // markdownlint replaces content inside HTML comments (including ">"
  // blockquote markers) with "." in params.lines, which breaks own-line
  // and blockquote-level detection.
  let rawLines;
  try {
    rawLines = fs.readFileSync(params.name, "utf8").split(/\r?\n/);
  } catch {
    rawLines = null;
  }
  const paramsLines = params.lines || [];
  // Map content-relative params.lines[i] to full-file rawLines.
  // Don't use frontMatterLines.length: markdownlint may drop a trailing ""
  // from that array, so its length can disagree with the real line offset.
  const rawLineOffset =
    rawLines && paramsLines.length > 0 ? rawLines.length - paramsLines.length : 0;

  let codeFenceState = shared.createCodeFenceState();

  let openComment = null; // { lineNumber, isOwnLine, bqLevel, baseColumn, detail }

  shared.forEachLine(params, (line, i) => {
    const lineNumber = i + 1;
    const original = line;
    // Raw file line corresponding to this params.lines entry
    const rawLine = rawLines ? (rawLines[i + rawLineOffset] ?? line) : line;

    // Strip inline code
    line = line.replace(/`[^`].*`/, "");

    // Detect fences from the RAW line: markdownlint masks comment bodies with ".",
    // so a real fence opener (e.g. ```html) sitting inside another HTML comment
    // would be hidden, and a later ``` would be misread as a fresh opener — leaving
    // the state "inside code block" forever.
    codeFenceState = shared.updateCodeFenceState(rawLine, codeFenceState);
    const inCodeBlock = codeFenceState.inCodeBlock;
    // Skip code-block lines unless we have an open comment: a --> inside a fenced
    // code block still closes the HTML comment per HTML spec, and skipping it would
    // leave openComment set, causing false positives on any later --> in regular content.
    if (inCodeBlock && !openComment) return;

    let inlineCount = 0;
    let pos = 0;

    while (pos < line.length) {
      if (!openComment) {
        // Look for <!--
        const openIdx = line.indexOf("<!--", pos);
        if (openIdx === -1) break;

        // Look for --> on the same line after <!--
        const closeIdx = line.indexOf("-->", openIdx + 4);
        if (closeIdx !== -1) {
          // Inline comment found
          inlineCount++;
          pos = closeIdx + 3;
        } else {
          // Multi-line comment opening
          const openerOwn = isOwnLine(rawLine, "<!--");
          const openerIdx = rawLine.indexOf("<!--");
          openComment = {
            lineNumber,
            isOwnLine: openerOwn,
            bqLevel: blockquoteLevel(rawLine),
            // Baseline column for body-indent checks: where `<!--` begins on
            // the raw opener line. Only meaningful for own-line openers.
            baseColumn: openerOwn ? openerIdx : -1,
            detail: original.trim(),
          };
          break; // Rest of line is inside the comment
        }
      } else {
        // Inside an open comment, look for -->
        const closeIdx = line.indexOf("-->", pos);
        if (closeIdx === -1) {
          // Still inside the comment: this is a body line — validate indent.
          validateOwnLineCommentBody(
            rawLine,
            openComment,
            onError,
            lineNumber,
            original.trim(),
            inCodeBlock
          );
          break;
        }

        const closeIsOwn = isOwnLine(rawLine, "-->");
        const closeBqLevel = blockquoteLevel(rawLine);
        if (!(openComment.isOwnLine && closeIsOwn)) {
          // If `<!--` is own-line, the mismatch is on `-->`; otherwise flag the opener line.
          const errorLine = openComment.isOwnLine ? lineNumber : openComment.lineNumber;
          const detail =
            errorLine === openComment.lineNumber ? openComment.detail : original.trim();
          shared.addError(onError, errorLine, MIXED_STYLE_MSG, detail);
        } else if (openComment.bqLevel !== closeBqLevel) {
          // Mismatched blockquote depth: flag the line whose `>` count does not match
          // the other delimiter (deeper open → close is wrong; deeper close → open is wrong).
          const errorLine =
            openComment.bqLevel > closeBqLevel ? lineNumber : openComment.lineNumber;
          const detail =
            errorLine === openComment.lineNumber ? openComment.detail : original.trim();
          shared.addError(onError, errorLine, CROSSES_ADMONITION_MSG, detail);
        }
        openComment = null;
        pos = closeIdx + 3;
      }
    }

    if (inlineCount > 1) {
      shared.addError(onError, lineNumber, MULTIPLE_INLINE_MSG, original.trim());
    }
  });
}

export default {
  names,
  description,
  tags,
  function: function_,
};
