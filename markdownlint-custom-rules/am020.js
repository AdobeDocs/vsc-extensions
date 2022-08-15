// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

'use strict';

const shared = require('./shared');
// const httpService = require("./httpService")
const https = require('https');
const jsyaml = require('js-yaml');

const debug = false;
module.exports = {
  names: ['AM020', 'metadata-values'],
  description: 'Invalid Metadata',
  tags: ['link'],
  function: function AM019(params, onError) {
    // handled in packaging now
    return;

    // console.log(params.frontMatterLines)
    var solutions = null;
    var strippedfm = '';

    // var solutions = JSON.parse(require('child_process').execSync('curl -s ' + apiurl).toString())["data"]
    var solutions = shared.solutions;

    for (const line of params.frontMatterLines) {
      if (line != '---') {
        // Remove DNL: re.sub(r"\[![a-zA-Z0-9]+ (.*?)\]", "\\1", line)
        let sanitizedline = line.replace(/\[![a-zA-Z0-9]+ (.*?)\]/, '$1');
        strippedfm = strippedfm + '\n' + sanitizedline + '\n';
        if (debug && line != sanitizedline) {
          console.log('line: ' + line);
          console.log('sine: ' + sanitizedline);
        }
      }
    }
    if (strippedfm != '') {
      var badcount = 0;
      if (debug) {
        console.log(strippedfm);
      }

      try {
        var meta = jsyaml.safeLoad(strippedfm);
        if (debug) {
          console.log(Object.keys(meta));
        }
        var badsolutions = '';
        if (!meta.hasOwnProperty('description')) {
          shared.addWarningContext(
            params.name,
            'Metadata',
            '',
            module.exports.names[0] +
              '/' +
              module.exports.names[1] +
              ' "description" metadata missing'
          );
          // shared.addErrorDetailIf(onError, 1, null, '"description" metadata missing', null)
        } else {
          if (meta['description'] == null) {
            shared.addWarningContext(
              params.name,
              'Metadata',
              '',
              module.exports.names[0] +
                '/' +
                module.exports.names[1] +
                ' invalid "description": ' +
                meta['description']
            );
            // shared.addErrorDetailIf(onError, 1, null, 'invalid "description": ' + meta['description'], null)
          }
        }
        if (meta.hasOwnProperty('solution')) {
          var msolution = meta['solution'];
          var metaSolutions = msolution
            .split(',')
            .forEach(function (value, index, array) {
              let solution = value.trim();
              if (!solutions.includes(solution)) {
                badcount++;
                if (badcount > 1) {
                  badsolutions += ' and "' + solution + '" ';
                } else if (badcount == 1) {
                  badsolutions += '"' + solution + '" ';
                }
              }
            });

          if (badcount > 1) {
            // console.log('BAD SOLUTIONS: ' + badsolutions)
            shared.addErrorDetailIf(
              onError,
              1,
              null,
              'Invalid solutions specified in YAML: ' + badsolutions,
              null
            );
          } else if (badcount == 1) {
            shared.addErrorDetailIf(
              onError,
              1,
              null,
              'Invalid solution specified in YAML: ' + badsolutions,
              null
            );
          }
          if (debug) {
            console.log(metaSolutions);
          }
        }
      } catch (err) {
        shared.addErrorDetailIf(
          onError,
          1,
          null,
          err.toString().replace('YAMLException: ', ''),
          null
        );
      }
    }
  },
};
