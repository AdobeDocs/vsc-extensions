// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

const listItemMarkerInterruptsRe = /^[\s>]*(?:[*+-]|1\.)\s+/;
const blankOrListRe = /^[\s>]*($|\s)/;

module.exports = {
  names: ['AM024', 'List item bullet/numner on line by itself'],
  description: 'List items should contian content on bullet line',
  tags: ['bullet', 'ul', 'ol'],
  function: function AM024(params, onError) {
    let inList = false;
    let prevLine = '';

    shared.filterTokens(params, 'list_item_open', function forToken(token) {
      // console.log(token)
      let match = /^[0-9*+-]+[\.]*$/.exec(token.line.trim());
      if (match) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
    });
  },
};
