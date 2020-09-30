// @ts-check

"use strict";

const shared = require("./shared");

// > [!NOTE]
// should be
// >[!NOTE]

module.exports = {
  names: ["AM009", "malformed-adobemark-block"],
  description: "AdobeMark is malformed",
  tags: ["adobemark", "adobemark"],
  function: function am009(params, onError) {
    shared.filterTokens(params, "blockquote_open", function forToken(token) {
      if (token.line.indexOf("[!") > 0) {
        // is it AFM component
        if (token.line.match(/\>\s+\[!/)) {
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }
        var trimmed = token.line.trim().replace(/\].*$/, "]");
        if (
          token.line.trim() !== trimmed &&
          token.line.indexOf("[!VIDEO]") <= 0
        ) {
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }
        if (token.line.indexOf("[!VIDEO]") > 0) {
          trimmed = token.line.trim().replace(/\).*$/, ")");
          if (token.line.trim() !== trimmed) {
            shared.addErrorContext(onError, token.lineNumber, token.line);
          }
        }
      }
    });
  },
};
