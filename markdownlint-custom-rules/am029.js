// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM029', 'git-merge-conflict-lines'],
  description: 'Markdown source contains git merge conflict lines',
  tags: ['warnings', 'git-merge-conflict'],
  function: function AM029(params, onError) {
    const codeBlockRe = new RegExp('```');
    var inCodeBlock = false;
    var isWarning = true;
    shared.forEachLine(function forLine(line, lineIndex) {
      line = line.replace(/`{1}[^`].*?`{1}/, 'CODE');
      const lineNumber = lineIndex + 1;
      inCodeBlock = shared.inCodeBlock(line, inCodeBlock);
      if (!inCodeBlock) {
        if (line.startsWith('<<<<<<< HEAD')) {
          shared.addErrorContext(onError, lineNumber, line);
        }
      }
    });
  },
};
