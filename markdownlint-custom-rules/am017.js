// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM017', 'text-following-id-tag-heading'],
  description: 'No text or images after header ID Tags ({#id-tag-name}',
  tags: ['headings', 'headers'],
  function: function AM017(params, onError) {
    let prevLevel = 0;
    shared.filterTokens(params, 'heading_open', function forToken(token) {
      var line = token.line
        .replace(/`.*?`/, 'code')
        .replace(/{{.*?}}/, 'SNIPPET');
      // console.log(line)
      if (line.match(/^[#]+.*?{/gm)) {
        if (line.match(/^[#]+.*?{[#].*?}[\s]*$/gm)) {
          // console.log('GOOD:' + token.line + ' ' + line)
        } else {
          // console.log('BAD: ' + token.line + ' ' + line)
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }
      }
    });
  },
};
