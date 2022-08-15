// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

// > [!NOTE]
// should be
// >[!NOTE]

var blocktags = [
  'NOTE',
  'TIP',
  'IMPORTANT',
  'WARNING',
  'CAUTION',
  'VIDEO',
  'MORELIKETHIS',
  'CONTEXTUALHELP',
  'ADMIN',
  'AVAILABILITY',
  'PREREQUISITES',
];

var inlinetags = ['UICONTROL', 'DNL'];

var alltags = blocktags.concat(inlinetags);

function containsAfmTag(line) {
  var foundtag = false;
  for (var i = 0, len = blocktags.length; i < len; i++) {
    var tags = line.match('!' + blocktags[i]);
    if (!foundtag) {
      // console.log(tags)
      if (tags != null) {
        foundtag = true;
      } else {
        foundtag = false;
      }
    }
  }
  return foundtag;
}

module.exports = {
  names: ['AM021', 'youtube-video'],
  description: 'YouTube videos are not supported',
  tags: ['adobe-markdown', 'adobe-markdown'],
  function: function AM021(params, onError) {
    var incodeblock = false;

    shared.filterTokens(params, 'blockquote_open', function forToken(token) {
      var line = token.line;
      if (token.line.indexOf('[!') > 0) {
        // is it AFM component

        // TODO: split the tag out here
        if (token.line.indexOf('[!VIDEO]') > 0) {
          // check for content after the video link
          var line = token.line;

          if (line.includes('youtube.com') || line.includes('youtu.be')) {
            shared.addErrorContext(onError, token.lineNumber, token.line);
          }
        }
      }
    });
  },
};
