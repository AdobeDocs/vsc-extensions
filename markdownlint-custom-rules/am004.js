// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "AM004", "malformed-table" ],
  "description": "Malformed markdown table",
  "tags": [ "tables", "asideblock" ],
  
  "function": function AM004(params, onError) {
    // shared.filterTokens(params, "^\|[^\|]*$", function forToken(token) {
    const tableMissingCloseRe = new RegExp("^\\s*\\|(.*?)[^\\|]\$");
    const asideBlockRe = new RegExp("^\\|[^\\|]\*\$");    // const missingClosingPipe = new RegExp("^\\s*\\")
    const codeBlockRe = new RegExp("```");
    var inCodeBlock = false;
    var tablelines = []
    shared.filterTokens(params, "table_open", function forToken(token) {
      var begin = token.map[0] + 1 + params.frontMatterLines.length
      var end = token.map[1] + 1 + params.frontMatterLines.length

      tablelines.push(token.map)
    })
    shared.forEachLine(function forLine(line, lineIndex) {
      const lineNumber = lineIndex + 1;
      const realLineNumber = lineNumber + params.frontMatterLines.length
      const tableClose = tableMissingCloseRe.exec(line.trim());
      const asideblock = asideBlockRe.exec(line);
      const codeBlockMatch = codeBlockRe.exec(line);
      let errorList = []
      let errorBadStyle = 'incorrect table style: must be table-layout:auto or table-layout:fixed'
      let errorOnlyStyle = 'style definition must be on line by itself'
      let errorNoBlankLine = 'blank line between markdown table and style required'
      let errorStyleBeforeTable = 'style definition must come after markdown table and blank line'
      let errorStr = ''

      if (codeBlockMatch) {
        inCodeBlock = !inCodeBlock;
      }

      line = line.replace(/`.*?`/, 'code')
      if (!inCodeBlock && line.includes('{style="table')) {


        // No blank line between table and style
        let pass = false
        for (let step = 0; step < tablelines.length; step++) {
          let tableStart = tablelines[step][0] + params.frontMatterLines.length
          let tableEnd = tablelines[step][1] + params.frontMatterLines.length

          // console.log(tableStart, tableEnd,mdlint realLineNumber)
          if (realLineNumber == tableEnd + 2) {
            pass = true
          }
        }
        if (!pass) {
          errorList.push(errorStyleBeforeTable)
        }
      

        // No blank line between table and style
        for (let step = 0; step < tablelines.length; step++) {
          if (lineIndex == tablelines[step][1]) {
            errorList.push(errorNoBlankLine)
          }
        }

        // Style definition must be on line by itself
        if (line.replace(/{style="table-layout:.*?"}/, '').trim() != "") {
          errorList.push(errorOnlyStyle)
        }

        // online auto and fixed are acceptable styles
        let style = line.replace(/.*?{style="(.*?)"}/, "$1").trim()
        if (style != 'table-layout:auto' && style != 'table-layout:fixed') {
          errorList.push(errorBadStyle)
        }

        
        for (let step = 0; step < errorList.length; step++) {
          if (errorStr != '') {
            errorStr += ', '
          }
          errorStr += errorList[step]
        }
        if (errorStr != '') {
          shared.addError(onError, lineNumber, errorStr, line, shared.rangeFromRegExp('/.*/'))
        }
      }
      if (tableClose && !inCodeBlock) {
        shared.addError(onError, lineNumber,
          line, "Table row missing closing pipe",
          shared.rangeFromRegExp(line, tableMissingCloseRe));
      }
      if (asideblock && !inCodeBlock) {
        shared.addError(onError, lineNumber,
          line, "Line contains errant pipe symbol",
          shared.rangeFromRegExp(line, asideBlockRe));
      }

    });
  }
};

