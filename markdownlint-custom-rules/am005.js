// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM005', 'anchor-id-starts-with-number'],
  description: 'Anchor ids {#..} must begin with letter',
  tags: ['anchors', 'anchors'],
  function: function AM005(params, onError) {
    const codeBlockRe = new RegExp('```');
    var inCodeBlock = false;
    const idStartsWithNumberRe = new RegExp('.*?{#d+.*?}');
    shared.forEachLine(function forLine(line, lineIndex) {
      const lineNumber = lineIndex + 1;
      const codeBlockMatch = codeBlockRe.exec(line);
      const idStartsWithNumberMatch = idStartsWithNumberRe.exec(line);

      if (codeBlockMatch) {
        inCodeBlock = !inCodeBlock;
      }
      if (!inCodeBlock && line.match(/.*?{#\d+.*?}/)) {
        shared.addErrorContext(onError, lineNumber, line);
      }
    });
  },
};
