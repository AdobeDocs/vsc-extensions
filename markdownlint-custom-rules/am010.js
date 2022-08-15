// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM010', 'id-tag-has-hash'],
  description:
    'ID Tags ({#id-tag-name} cannot contain additional hash marks ({#id-has-#hash}',
  tags: ['headings', 'headers'],
  function: function AM010(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, 'heading_open', function forToken(token) {
      var heading_title = token.line.replace(/^[#]+ /g, '');
      if (heading_title.match(/.*{#.*[#].*}/)) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
    });
  },
};
