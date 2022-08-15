// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM013', 'code-block-fence-too-many-ticks'],
  description: 'Code blocks should have only three ticks',
  tags: ['code', 'indent_level'],
  function: function AM013(params, onError) {
    const lines = params.lines;
    var openFenceIndent = -1;
    var inCode = false;
    var lastFenceLine = -1;

    shared.forEachLine(function forLine(line, i) {
      line = line.replace('>', ' '); // get rid of blockquotes
      line = line.replace(/```.*?```/, 'reg');

      var lineindent = line.search(/\S|$/);
      var fenceindent = line.search('```');
      var inline = false;
      if (line.search('````') >= 0) {
        shared.addErrorContext(onError, i + 1, lines[i].trim());
      }
    });
  },
};
