// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');

module.exports = {
  names: ['AM012', 'code-block-indent-and-fence'],
  description: 'Code blocks wrong indent level',
  tags: ['code', 'indent_level'],
  function: function AM012(params, onError) {
    const lines = params.lines;
    var openFenceIndent = -1;
    var inCode = false;
    var lastFenceLine = -1;
    var codeblockcount = 0;

    shared.forEachLine(function forLine(line, i) {
      var oldline = line;
      line = line.replace('>', ' '); // get rid of blockquotes
      line = line.replace(/```.*?```/, 'reg'); // remove inline code
      line = line.replace(/^[\s]*\\[\s]*$/, ''); // remove backslashes used as replacements for html comments in shared.clearHtmlCommentText()

      // if (line != oldline) {
      //     console.log('< ' + oldline)
      //     console.log('> ' + line)
      //     console.log()
      // }

      var lineindent = line.search(/\S|$/);
      var fenceindent = line.search('```');
      var inline = false;
      var inlinehits = line.match(/```.*```/g); //+ line.match(/`.*```.*`/g)

      if (inlinehits != null && inlinehits > 0) {
        inline = true;
      }
      // console.log(line.trim().search('```') + ':' + line.trim())
      if (fenceindent >= 0 && !inline && line.trim().search('```') == 0) {
        // we have a codeblock fence AND it is not ```inline```
        codeblockcount++;
        if (inCode) {
          if (openFenceIndent != fenceindent) {
            shared.addErrorContext(onError, i + 1, lines[i].trim());
          }
          inCode = false;
        } else {
          inCode = true;
          openFenceIndent = fenceindent;
          lastFenceLine = i;
        }
      } else {
        if (inCode) {
          if (lineindent < openFenceIndent && line.trim().length) {
            // console.log(inCode + ' ' + + lineindent + ' ' + openFenceIndent + ' ' + line.trim().length)
            shared.addErrorContext(onError, i + 1, lines[i].trim());
          }
        }
        if (inCode && line.match(/\s*```/) && line.search('```') >= 0) {
          // don't trigger the failure if the code is indented further left than the fence backticks
          if (line.length > 0 && lineindent < openFenceIndent) {
            shared.addErrorContext(onError, i + 1, lines[i].trim());
          }
        }
      }
    });
    if (inCode) {
      module.exports['description'] = 'Unclosed codeblock';
      shared.addError(onError, lastFenceLine + 1, lines[lastFenceLine].trim());
    }
  },
};
