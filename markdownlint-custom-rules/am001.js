'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM001', 'heading-title-starts-with-numbers'],
  description: 'Headings cannot contain numbers without named anchor {#..}',
  tags: ['headings', 'headers'],
  function: function am001(params, onError) {
    shared.filterTokens(params, 'heading_open', function forToken(token) {
      var headingTitle = token.line.replace(/.*?[#]+ /g, '');

      if (headingTitle.match(/.*?\d+/) && !headingTitle.match(/\{\#.*?\}$/)) {
        shared.addErrorContext(onError, token.lineNumber, token.line);
      }
    });
  },
};
