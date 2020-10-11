'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM013', 'code-block-fence-too-many-ticks'],
  description: 'Code blocks should have only three ticks',
  tags: ['code', 'indent_level'],
  function: function am013(params, onError) {
    const lines = params.lines;
    shared.forEachLine(function forLine(line, i) {
      line = line.replace('>', ' '); // get rid of blockquotes
      line = line.replace(/```.*?```/, 'reg');
      if (line.search('````') >= 0) {
        shared.addErrorContext(onError, i + 1, lines[i].trim());
      }
    });
  },
};
