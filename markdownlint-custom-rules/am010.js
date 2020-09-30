// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  names: ["AM010", "id-tag-has-hash"],
  description:
    "ID Tags ({#id-tag-name} cannot contain additional hash marks ({#id-has-#hash}",
  tags: ["headings", "headers"],
  function: function am010(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, "heading_open", function forToken(token) {
      var headingTitle = token.line.replace(/^[#]+ /g, "");
      if (headingTitle.match(/.*{#.*[#].*}/)) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
    });
  },
};
