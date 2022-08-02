// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "AM003", "hr not supported" ],
  "description": "Horizontal rules are not supported",
  "tags": [ "hr" ],
  "function": function AM003(params, onError) {
    shared.filterTokens(params, "hr", function forToken(token) {
      shared.addErrorContext(onError, token.lineNumber, token.line)
    });
  }
};
