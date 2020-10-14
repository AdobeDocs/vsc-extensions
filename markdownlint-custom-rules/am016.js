'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM016', 'mismatched-brackets'],
  description: 'Unmatched brackets, parens or braces',
  tags: ['code', 'indent_level'],
  function: function am016(params, onError) {
    const lines = params.lines;
    var inCodeBlock = false;

    shared.forEachLine(function forLine(line, i) {
      inCodeBlock = shared.inCodeBlock(line, inCodeBlock);
      if (!inCodeBlock) {
        line = line.replace(/([^`])`.*?`([^`])/g, '$1code$2');

        var opensquares = (line.match(/\[/g) || []).length;
        var clossquares = (line.match(/\]/g) || []).length;
        var openfrench = (line.match(/\{/g) || []).length;
        var closfrench = (line.match(/\}/g) || []).length;

        if (opensquares !== clossquares) {
          shared.addErrorContext(onError, i + 1, lines[i].trim());
        }

        if (openfrench !== closfrench) {
          shared.addErrorContext(onError, i + 1, lines[i].trim());
        }
      }
    });
  },
};
