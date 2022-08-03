// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "AM008", "header-contains-link" ],
  "description": "Heading contains link",
  "tags": [ "headings", "headers" ],
  "function": function AM008(params, onError) {
    // const headingHasLinkRe = new RegExp("[^!]\\[.*\\]\\(.*\\)");
    const headingHasLinkRe = new RegExp("[^!]\\[.*\\]\\(.*\\)");
    shared.forEachHeading(params, function forHeading(heading, content) {
      const match = headingHasLinkRe.exec(content);
      if (match) {
        shared.addError(onError, heading.lineNumber,
          "Heading contains a link: '" + match[0] + "'", null,
          shared.rangeFromRegExp(heading.line, headingHasLinkRe));
      }
    });
  }
};
