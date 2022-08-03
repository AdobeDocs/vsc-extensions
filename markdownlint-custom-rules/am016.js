// @ts-check

"use strict";

const shared = require("./shared");

module.exports = {
  "names": [ "AM016", "mismatched-brackets-backticks" ],
  "description": "Unmatched brackets, parens, braces or backticks",
  "tags": [ "code", "indent_level" ],
  "function": function AM016(params, onError) {
    const lines = params.lines;
    var openFenceIndent = -1
    var inCodeBlock = false
    var lastFenceLine = -1
    var codeblockcount = 0
    var pre = ''
    shared.forEachLine(function forLine(line, i) {

        var prevInCodeBlock = inCodeBlock
        inCodeBlock = shared.inCodeBlock(line, inCodeBlock)
        if (inCodeBlock || prevInCodeBlock) { // } || (line.match(/.*?```/) || []).length > 0) {
            pre = '>'
        } else {
            pre = '   '
        }
        // console.log(pre + line)

        if (!inCodeBlock) {
            var oldline = line
            // line = oldline.replace(/`{1,3}.*?`{1,3}/g, ' <code> ')
            line = oldline.replace(/```.*?```/g, ' <code3> ')
            line = line.replace(/^[\s]*[>]*[\s]*```/, '<fence>')
            line = line.replace(/``.*?``/g, ' <code2> ')
            line = line.replace(/`.*?`/g, ' <code1> ')
            line = line.replace(/\\`/g, '&grave')

            var opensquares = (line.match(/\[/g) || []).length
            var clossquares = (line.match(/\]/g) || []).length
            var openparens = (line.match(/\(/g) || []).length
            var closparens = (line.match(/\)/g) || []).length
            var openfrench = (line.match(/\{/g) || []).length
            var closfrench = (line.match(/\}/g) || []).length
            var openangle = (line.match(/\</g) || []).length
            var closangle = (line.match(/\>/g) || []).length
            var backticks = (line.match(/\`/g) || []).length

            // if (line != oldline) {
            //     console.log(pre + '- ' + oldline)
            //     console.log(pre + '+ ' + line)
            // } 
            // else {
            //     console.log(pre + line)
            // }
            if (backticks%2 != 0) {
                //unclosed backtick/inline code block -- odd number of backticks
                shared.addErrorContext(onError, i + 1, lines[i].trim());
            }

            if (opensquares != clossquares) {
                // if (line != oldline) {
                //     console.log('OLD: ' + oldline)
                //     console.log('NEW: ' + line)
                //     console.log()
                // }
    
                // console.log('Mismatched square brackets: ' + opensquares + ':' + clossquares + ' ' + line) 
                shared.addErrorContext(onError, i + 1, lines[i].trim());
            }
            // if (openparens != closparens) {
            //     console.log('Mismatched parens: ' + line)
            //     shared.addErrorContext(onError, i + 1, lines[i].trim());
            // }
            // if (openangle != closangle) {
            //     console.log('Mismatched angle brackets: ' + line)
            //     shared.addErrorContext(onError, i + 1, lines[i].trim());
            // }

            if (openfrench != closfrench) {
                // console.log('Mismatched french braces: ' + line)
                // if (line != oldline) {
                //     console.log('OLD: ' + oldline)
                //     console.log('NEW: ' + line)
                //     console.log()
                // }
                shared.addErrorContext(onError, i + 1, lines[i].trim());
            }
    
        }
        
    });


  }
};
