// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names =  [ "AM004", "malformed-table" ];
export const description = "Malformed markdown table";
export const tags = [ "tables", "asideblock" ];

export function function_(params, onError) {
  // shared.filterTokens(params, "^\|[^\|]*$", function forToken(token) {
  const tableMissingCloseRe = new RegExp("^\\s*\\|(.*?)[^\\|]$");
  const asideBlockRe = new RegExp("^\\|[^\\|]*$");    // const missingClosingPipe = new RegExp("^\\s*\\")
  const tableTrailingSpaceRe = new RegExp("\\|\\s+$");
  const codeBlockRe = new RegExp("```");
  let inCodeBlock = false;
  const tablelines = [];

  const fm = (params.frontMatterLines?.length || 0);

  shared.filterTokens(params, "table_open", function forToken(token) {
    if (Array.isArray(token.map)) {
      const begin = token.map[0] + 1 + fm;
      const end = token.map[1] + fm;
      tablelines.push([begin, end]);
    }
  });

  // Performance optimization: track current table as we iterate through lines
  let currentTableIndex = 0;
  let isInTable = false;

  shared.forEachLine(params, function forLine(inLine, lineIndex) {
    let line = inLine;
    const lineNumber = lineIndex + 1;
    const realLineNumber = lineNumber + fm;

    const tableClose = tableMissingCloseRe.exec(line.trim());
    const asideblock = asideBlockRe.exec(line);
    const codeBlockMatch = codeBlockRe.exec(line);

    let errorList = [];
    let errorBadStyle = 'incorrect table style: must be table-layout:auto or table-layout:fixed';
    let errorOnlyStyle = 'style definition must be on line by itself';
    let errorNoBlankLine = 'blank line between markdown table and style required';
    let errorStyleBeforeTable = 'style definition must come after markdown table and blank line';

    if (codeBlockMatch) {
      inCodeBlock = !inCodeBlock;
    }

    line = line.replace(/`.*?`/, 'code');
    if (!inCodeBlock && line.includes('{style="table')) {

      // No blank line between table and style
      let pass = false;
      for (let step = 0; step < tablelines.length; step++) {
        const tableEnd = tablelines[step][1];
        if (realLineNumber === tableEnd + 2) {
          pass = true;
          break;
        }
      }
      if (!pass) {
        errorList.push(errorStyleBeforeTable);
      }

      // No blank line between table and style
      for (let step = 0; step < tablelines.length; step++) {
        if (realLineNumber === tablelines[step][1] + 1) {
          errorList.push(errorNoBlankLine);
          break;
        }
      }

      // Style definition must be on line by itself
      if (line.replace(/{style="table-layout:.*?"}/, '').trim() !== "") {
        errorList.push(errorOnlyStyle);
      }

      // online auto and fixed are acceptable styles
      let style = line.replace(/.*?{style="(.*?)"}/, "$1").trim();
      if (style !== 'table-layout:auto' && style !== 'table-layout:fixed') {
        errorList.push(errorBadStyle);
      }

      if (errorList.length > 0) {
        const errorStr = errorList.join(', ');
        shared.addError(onError, lineNumber, errorStr, inLine, [1, inLine.length]);
      }
    }
    if (tableClose && !inCodeBlock) {
      shared.addError(onError, lineNumber,
        "Table row missing closing pipe",
        inLine,
        shared.rangeFromRegExp(inLine, tableMissingCloseRe));
    }
    if (asideblock && !inCodeBlock) {
      shared.addError(onError, lineNumber,
        "Line contains errant pipe symbol",
        inLine,
        shared.rangeFromRegExp(inLine, asideBlockRe));
    }

    // Update table tracking (O(1) amortized - each table processed once)
    if (currentTableIndex < tablelines.length) {
      const [tableStart, tableEnd] = tablelines[currentTableIndex];

      // Check if we've entered the current table
      if (realLineNumber >= tableStart && realLineNumber <= tableEnd) {
        isInTable = true;
      }
      // Check if we've passed the current table
      else if (realLineNumber > tableEnd) {
        isInTable = false;
        currentTableIndex++;
        // Check if we've immediately entered the next table
        if (currentTableIndex < tablelines.length) {
          const [nextStart, nextEnd] = tablelines[currentTableIndex];
          if (realLineNumber >= nextStart && realLineNumber <= nextEnd) {
            isInTable = true;
          }
        }
      }
      else {
        isInTable = false;
      }
    }

    // Check for trailing spaces after closing pipe in table rows
    const trailingSpace = tableTrailingSpaceRe.exec(inLine);
    if (trailingSpace && !inCodeBlock && isInTable) {
      shared.addError(onError, lineNumber,
        "Table row has trailing spaces after closing pipe",
        inLine,
        shared.rangeFromRegExp(inLine, tableTrailingSpaceRe));
    }
  });
}

export default {
  names,
  description,
  tags,
  function: function_,
};