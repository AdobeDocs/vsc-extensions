'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM011', 'link-syntax'],
  description: 'Spaces between link components',
  tags: ['warnings', 'link'],
  function: function am011(params, onError) {
    shared.makeTokenCache(params); // Ensure a token cache as a side-effect. - GDE 20201011
    const spaceinlinkRe = new RegExp('\\[[^!].*?\\]s+\\(');
    const codeBlockRe = new RegExp('```');
    var inCodeBlock = false;
    var isWarning = true;
    shared.forEachLine(function forLine(line, lineIndex) {
      const lineNumber = lineIndex + 1;
      const spaceinlink = spaceinlinkRe.exec(line);
      const codeBlockMatch = codeBlockRe.exec(line);

      if (codeBlockMatch) {
        inCodeBlock = !inCodeBlock;
      }

      if (!inCodeBlock && spaceinlink) {
        if (isWarning) {
          shared.addWarningContext(
            params.name,
            lineNumber + params.frontMatterLines.length,
            line,
            module.exports.names[0] +
              '/' +
              module.exports.names[1] +
              ' ' +
              module.exports.description
          );
        } else {
          shared.addErrorContext(onError, lineNumber, line);
        }
      }
    });
  },
};
