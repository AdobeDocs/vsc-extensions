// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  names: ["AM004", "empty-table"],
  description: "Malformed markdown table row",
  tags: ["tables", "asideblock"],

  function: function am004(params, onError) {
    // shared.filterTokens(params, "^\|[^\|]*$", function forToken(token) {
    const tableMissingCloseRe = new RegExp("^\\s*\\|(.*?)[^\\|]$");
    const asideBlockRe = new RegExp("^\\|[^\\|]*$"); // const missingClosingPipe = new RegExp("^\\s*\\")
    const codeBlockRe = new RegExp("```");
    var inCodeBlock = false;
    shared.forEachLine(function forLine(line, lineIndex) {
      const lineNumber = lineIndex + 1;
      const tableClose = tableMissingCloseRe.exec(line.trim());
      const asideblock = asideBlockRe.exec(line);
      const codeBlockMatch = codeBlockRe.exec(line);

      if (codeBlockMatch) {
        inCodeBlock = !inCodeBlock;
      }

      if (tableClose && !inCodeBlock) {
        shared.addError(
          onError,
          lineNumber,
          line,
          "Table row missing closing pipe",
          shared.rangeFromRegExp(line, tableMissingCloseRe)
        );
      }
      if (asideblock && !inCodeBlock) {
        shared.addError(
          onError,
          lineNumber,
          line,
          "Line contains errant pipe symbol",
          shared.rangeFromRegExp(line, asideBlockRe)
        );
      }
    });
  },
};
