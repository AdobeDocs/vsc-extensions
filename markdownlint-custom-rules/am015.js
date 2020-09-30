// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  names: ["AM015", "malformed-html-comment"],
  description: "HTML comment malformed",
  tags: ["html", "comment"],
  function: function am015(params, onError) {
    const lines = params.lines;
    var inCodeBlock = false;
    shared.forEachLine(function forLine(line, i) {
      line = line.replace(/`[^`].*`/, "");

      inCodeBlock = shared.inCodeBlock(line, inCodeBlock);

      if (!inCodeBlock && line.search(/<![-]*[>]+/) >= 0) {
        shared.addErrorContext(onError, i + 1, lines[i].trim());
      }
    });
  },
};
