// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  names: ["AM002", "id-tag-has-spaces"],
  description: "ID Tags ({#id-tag-name} cannot contain spaces",
  tags: ["headings", "headers"],
  function: function am002(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, "heading_open", function forToken(token) {
      var headingTitle = token.line.replace(/^[#]+ /g, "");
      if (headingTitle.match(/.*{#.*[ ].*}/)) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
    });
  },
};
