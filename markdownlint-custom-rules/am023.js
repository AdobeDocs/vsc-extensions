// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "AM023", "missing-table-pipes" ],
  "description": "Table must use outer pipes",
  "tags": [ "tables"],
  
  "function": function AM023(params, onError) {
    shared.filterTokens(params, "table_open", function forToken(token) {
      // remove whitespace and > if it's a note block
      var line = token.line.trim().replace(/^>/, '').trim()
      if (!line.startsWith("|")) {
        var lineNumber = token.lineNumber; // + params.frontMatterLines.length;
        // console.log(token, params.frontMatterLines.length)
        shared.addError(onError, lineNumber)

      }
    })

  }
};

