// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

var blocktags = [
  'NOTE',
  'TIP',
  'IMPORTANT',
  'WARNING',
  'CAUTION',
  'MORELIKETHIS',
  'CONTEXTUALHELP',
  'ADMIN',
  'AVAILABILITY',
  'PREREQUISITES',
  'Related Articles',
  'ERROR',
  'SUCCESS',
  'INFO',
  '__BETA_ACCORDIAN',
  '__BETA_TAB',
];

var singleLineBlocktags = ['VIDEO', '__BETA'];

function containsAfmTag(line) {
  var foundtag = false;
  for (var i = 0, len = blocktags.length; i < len; i++) {
    var tags = line.match('!' + blocktags[i]);
    if (!foundtag) {
      if (tags != null) {
        foundtag = true;
      } else {
        foundtag = false;
      }
    }
  }
  return foundtag;
}

function containsSingleLineAfmTag(line) {
  var foundtag = false;
  for (var i = 0, len = singleLineBlocktags.length; i < len; i++) {
    var tags = line.match('!' + singleLineBlocktags[i]);
    if (!foundtag) {
      if (tags != null) {
        foundtag = true;
      } else {
        foundtag = false;
      }
    }
  }
  return foundtag;
}

module.exports = {
  names: ['AM028', 'empty-admonition-block'],
  description: 'Admonition has blank line or no content',
  tags: ['blockquote', 'whitespace'],
  function: function AM028(params, onError) {
    params.tokens.forEach(function forToken(token) {
      if (token.type === 'blockquote_open') {
        if (containsAfmTag(token.line)) {
          var admonitionContentLength = 0;
          var numlines = token.map[1] - token.map[0];
          if (numlines < 2 && !containsSingleLineAfmTag(token.line)) {
            shared.addError(onError, token.lineNumber);
          } else if (!containsSingleLineAfmTag(token.line)) {
            for (let i = token.map[0] + 1; i < token.map[1]; i++) {
              var line = params.lines[i].replace(/[\s]*>/, '').trim();
              admonitionContentLength = admonitionContentLength + line.length;
            }
            if (admonitionContentLength == 0) {
              shared.addError(onError, token.lineNumber);
            }
          }
        }
      }
    });

    // check for blank lines in non-afm block quote
    var prevToken = {};
    params.tokens.forEach(function forToken(token) {
      if (
        token.type === 'blockquote_open' &&
        prevToken.type === 'blockquote_close' &&
        !containsAfmTag(token.line) &&
        !containsSingleLineAfmTag(token.line)
      ) {
        shared.addError(onError, token.lineNumber - 1);
      }
      prevToken = token;
    });
  },
};
