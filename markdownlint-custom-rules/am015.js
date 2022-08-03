// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "AM015", "malformed-html-comment" ],
  "description": "HTML comment malformed",
  "tags": [ "html", "comment" ],
  "function": function AM015(params, onError) {
    const lines = params.lines;
    var fmlen = params.frontMatterLines.length
    var inComment = false
    var lastCommentStart = -1

    var inCodeBlock = false;

    var htmlOpen = -1
    var htmlClose = -1


    shared.forEachLine(function forLine(line, i) {
        line = line.replace(/`[^`].*`/, '')

        inCodeBlock = shared.inCodeBlock(line, inCodeBlock)

        if (!inCodeBlock && line.search(/<![-]*[>]+/) >= 0) {
            shared.addErrorContext(onError, i+1, lines[i].trim())
        }        
    });
    shared.forEachLine(function forLine(line, i) {
        line = line.replace(/`[^`].*`/, '')
        inCodeBlock = shared.inCodeBlock(line, inCodeBlock)

        if (!inCodeBlock) { //} && line.search(/<![-]*[>]+/) >= 0) {
            if (line.search(/<![-][-]*/) >=0 ) {  // open comment
                // console.log('html comment open ' + (i+1+fmlen).toString())
                htmlOpen = i + 1  // i+1+fmlen
            }
            if (line.search(/[-][-]*>/) >=0 ){
                // console.log('html comment close ' + (i+1+fmlen).toString())
                htmlOpen = -1
            }

        }
    });
    if (htmlOpen != -1) {
        shared.addErrorDetailIf(onError, htmlOpen, null, 'Unclosed HTML comment', null)
    }

}
};
