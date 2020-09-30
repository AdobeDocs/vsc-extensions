// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  names: ["AM014", "code-block-language-has-curly-braces"],
  description: "Language identifier for code-blocks should not contain braces",
  tags: ["code", "indent_level"],
  function: function am014(params, onError) {
    const lines = params.lines;

    shared.forEachLine(function forLine(line, i) {
      line = line.replace(">", " "); // get rid of blockquotes
      line = line.replace(/```.*?```/, "reg");

      if (line.match(/```.*\{/)) {
        shared.addErrorContext(onError, i + 1, lines[i].trim());
      }
      if (line.search("````") >= 0) {
        shared.addErrorContext(onError, i + 1, lines[i].trim());
      }
    });
  },
};
