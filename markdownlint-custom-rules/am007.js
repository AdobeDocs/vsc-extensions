// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM007', 'header-anchor-without-hash'],
  description: 'Heading anchor has no hash',
  tags: ['headings', 'headers'],
  function: function AM007(params, onError) {
    const anchorMissingHashRe = new RegExp('{[^#].*}$');
    shared.forEachHeading(params, function forHeading(heading, content) {
      content = content.replace(/{{.*?}}/, 'SNIPPET');
      const match = anchorMissingHashRe.exec(content);
      if (match) {
        // console.log(content)
        shared.addError(
          onError,
          heading.lineNumber,
          "Anchor without #: '" + match[0] + "'",
          null,
          shared.rangeFromRegExp(heading.line, anchorMissingHashRe)
        );
      }
    });
  },
};
