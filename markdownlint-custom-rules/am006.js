/* eslint-disable @typescript-eslint/naming-convention */
// @ts-check

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM006', 'dodgy-characters'],
  description: 'Detects invisible dodgy-characters and other dodgy characters',
  tags: ['control-characters'],
  function: function AM006(params, onError) {
    // const dodgy = new RegExp("[\xA0\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+(.+)[\xA0\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+(.+)";
    shared.forEachLine(function forLine(line, lineIndex) {
      const lineNumber = lineIndex + 1;
      if (line.match(/[\x00-\x08\x0A-\x0F]/)) {
        shared.addErrorContext(onError, lineNumber, line);
      }
    });
  },
};
