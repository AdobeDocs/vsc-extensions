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
  'Related Articles',
  'ERROR',
  'SUCCESS',
  'INFO',
  '__BETA_',
];

var inlinetags = ['UICONTROL', 'DNL', '__BETA_'];

var alltags = blocktags.concat(inlinetags);

function containsAfmTag(line) {
  var foundtag = false;
  for (var i = 0, len = blocktags.length; i < len; i++) {
    var tags = line.match('!' + blocktags[i]);
    if (!foundtag) {
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
  names: ['AM009', 'malformed-adobe-markdown-block'],
  description: 'adobe-markdown invalid',
  tags: ['adobe-markdown', 'adobe-markdown'],
  function: function AM009(params, onError) {
    var incodeblock = false;

    // check for stray AFM admonitions outside of blockquote or UICONTROL/DNL without brackets
    for (var i = 0; i < params.lines.length; i++) {
      if (i > 1) {
        incodeblock = shared.inCodeBlock(curline, incodeblock);
        var curline = params.lines[i];
        var prevline = params.lines[i - 1];
        var prevprevline = params.lines[i - 2];
        // console.log(i + 1, curline)
        if (!incodeblock) {
          if (
            prevprevline.trim().startsWith('>') &&
            !prevline.trim().startsWith('>') &&
            curline.trim().startsWith('>') &&
            !curline.includes('>[!') &&
            prevline.trim() !== ''
          ) {
            var warn = false;
            // console.log(curline, curline.length)
            if (warn) {
              shared.addWarningContext(
                params.name,
                i + params.frontMatterLines.length,
                prevline,
                module.exports.names[0] +
                  '/' +
                  module.exports.names[1] +
                  ' AFM (NOTE) block line missing ">"'
              );
            } else {
              shared.addErrorDetailIf(
                onError,
                i,
                null,
                'No > on AFM (NOTE) block line: ' + prevline.trim()
              );
            }
          }
        }
      }
    }

    // check for admonitions in non-comment html block
    shared.filterTokens(params, 'html_block', function forToken(token) {
      var lines = token.content.split('\n');
      if (!token.line.startsWith('<!--')) {
        lines.forEach(function forLine(line, lineNumber) {
          if (containsAfmTag(line)) {
            shared.addErrorDetailIf(
              onError,
              lineNumber + token.lineNumber,
              null,
              'Admonitions not supported in HTML: ' + line.trim()
            );
          }
        });
      }
    });
    shared.forEachLine(function forLine(line, lineIndex) {
      incodeblock = shared.inCodeBlock(line, incodeblock);
      if (!incodeblock) {
        var origline = line;
        line = line.replace(/`{1,3}.*?`{1,3}/g, ' <code> ');

        if (!line.match(/^[\s]*\>\[/gm)) {
          // admonition outside of block
          if (containsAfmTag(line) && !line.includes('__BETA_')) {
            shared.addErrorContext(onError, lineIndex + 1, line);
          }
        }

        var linetags = line.match(/\[![^\[].*?\]/g) || [];

        if (linetags.length > 0) {
          for (var i = 0; i < linetags.length; i++) {
            var tag = linetags[i].replace(/\[!(.*?)\]/, '$1').split(' ')[0];
            if (
              !tag.startsWith('__BETA_') &&
              !alltags.includes(tag) &&
              !line.match(/^\s*>/)
            ) {
              shared.addErrorContext(onError, lineIndex + 1, line);
            }
          }
        }
        // lower case DNL or UICONTROL
        if (line.match(/\[\!uicontrol/) || line.match(/\[\!dnl/)) {
          shared.addErrorContext(onError, lineIndex + 1, line);
        }

        // !DNL without brackets
        if (line.match(/[^\[]\!UICONTROL/) || line.match(/[^\[]\!DNL/)) {
          shared.addErrorContext(onError, lineIndex + 1, line);
        }

        // DNL with brackets, but no! [DNL foo]
        if (line.match(/[\[]UICONTROL/) || line.match(/[\[]DNL/)) {
          shared.addErrorContext(onError, lineIndex + 1, line);
        }

        // DNL with brackets, but in linktext [!DNL foo](link)
        if (
          line.match(/\[!UICONTROL\s[^\]]*?\]\(/) ||
          line.match(/\[!DNL\s[^\]]*?\]\(/)
        ) {
          shared.addErrorContext(onError, lineIndex + 1, line);
        }

        // UICONTROL with space [!UI CONTROL ...]
        if (line.match(/[\[]!UI\s+CONTROL/)) {
          shared.addErrorContext(onError, lineIndex + 1, line);
        }
      }
    });
    shared.filterTokens(params, 'blockquote_open', function forToken(token) {
      var line = token.line;
      var oline = token.map[0];
      var cline = token.map[1];

      var indent = token.line.indexOf('>');
      // console.log(token)
      for (var i = oline; i < cline; i++) {
        // console.log(params.lines[i])
        var lineindent = params.lines[i].indexOf('>');
        if (lineindent != indent) {
          if (lineindent < 0) {
            shared.addErrorDetailIf(
              onError,
              i + 1,
              indent.toString(),
              lineindent,
              'Missing blockquote marker (>) or newline'
            );
          } else {
            shared.addErrorDetailIf(
              onError,
              i + 1,
              indent.toString(),
              lineindent,
              'Mismatched Indent for Block Quote'
            );
          }
        }
      }
      // console.log(token)
      // console.log(token.lineNumber + params.frontMatterLines.length)
      // console.log(token.line)
      // console.log(indent)
      if (token.line.indexOf('[!') > 0) {
        // is it AFM component

        // TODO: split the tag out here
        var afmtag = line.split(/[\[\]]/)[1];

        if (
          afmtag.includes('!') &&
          !blocktags.includes(afmtag.replace('!', '')) &&
          afmtag != '!VIDEO' &&
          !afmtag.startsWith('!__BETA')
        ) {
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }
        if (!containsAfmTag(token.line)) {
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }
        if (token.line.match(/[\>]*\s+\[!/)) {
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }
        var trimmed = token.line.trim().replace(/\].*$/, ']');

        if (
          token.line.trim() != trimmed &&
          token.line.indexOf('[!VIDEO]') <= 0
        ) {
          // check for content after end of the container declaration
          shared.addErrorContext(onError, token.lineNumber, token.line);
        }

        if (token.line.indexOf('[!VIDEO]') > 0) {
          // check for content after the video link
          trimmed = token.line.trim().replace(/\).*$/, ')');
          if (token.line.trim() != trimmed) {
            shared.addErrorContext(onError, token.lineNumber, token.line);
          }
        }
      } else {
        var afmtag = line.split(/[\[\]]/)[1];

        // check for afm blocks without ! eg,  >[NOTE]
        for (var i = 0, len = blocktags.length; i < len; i++) {
          var repattern = '[\\s]*>\\s*\\[' + blocktags[i] + '\\s*\\]';
          var re = new RegExp(repattern);
          if (token.line.match(re) != null) {
            shared.addErrorContext(onError, token.lineNumber, token.line);
          }
        }
        // check for afm blocks with extra text ! eg,  >[NOTE]
        for (var i = 0, len = blocktags.length; i < len; i++) {
          var nobang_pattern = '[\\s]*>\\s*\\[!' + blocktags[i] + '\\s*\\]';
          var textafterafm_pattern =
            '[\\s]*>\\s*\\[!' + blocktags[i] + '\\s*\\]';
          var re = new RegExp(repattern);
          if (token.line.match(re) != null) {
            // shared.addErrorContext(onError, token.lineNumber, token.line);
          }
        }
        /*
                !AFM
                AFM
            */
        // check for afm tags without ! eg,  [DNL blah]
        for (var i = 0, len = inlinetags.length; i < len; i++) {
          var repattern = '[\\s]*\\s*\\[' + inlinetags[i] + '.*?\\]';
          var re = new RegExp(repattern);
          if (token.line.match(re) != null) {
            shared.addErrorContext(onError, token.lineNumber, token.line);
          }
        }
      }
    });
  },
};
