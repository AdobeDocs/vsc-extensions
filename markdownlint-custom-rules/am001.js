// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "AM001", "heading-title-starts-with-numbers"],
  "description": "Headings cannot contain numbers without named anchor {#..}",
  "tags": [ "headings", "headers" ],
  "function": function AM001(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, "heading_open", function forToken(token) {
      var heading_title = token.line.replace(/.*?[#]+ /g, "");

      if (heading_title.match(/.*?\d+/) && !heading_title.match(/\{\#.*?\}$/)) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
      // if (heading_title.match(/.*?{#\d+.*?}/)) {
      //   shared.addErrorContext(onError, token.lineNumber, token.line);
      // }
    });
  }
};
