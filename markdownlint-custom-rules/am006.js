'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM006', 'invisible-characters'],
  description: 'Detects invisible dodgy characters and control characters',
  tags: ['dodgy-characters', 'control-characters'],
  function: function am006(params, onError) {
    shared.makeTokenCache(params); // Ensure a token cache as a side-effect. - GDE 20201011
    shared.forEachLine(function forLine(line, lineIndex) {
      const lineNumber = lineIndex + 1;
      if (line.match(/[\x00-\x08\x0A-\x0F]/)) {
        shared.addErrorContext(onError, lineNumber, line);
      }
    });
  },
};
