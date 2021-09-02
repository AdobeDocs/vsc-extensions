'use strict';

// Alert
module.exports.alertOpener = /^>\[!/gm; // regex to find ">[!"
module.exports.alertWithSpace = /^>\s+\[!/gm;
module.exports.snippetOpener = /^>\s+\[!code-/gm; //identify code snippet in text block, starting with "> [!code-"
module.exports.includeOpener = /^>\s+\[!INCLUDE/gm; //identify include in text block, starting with "> [!INCLUDE"
module.exports.alertType = /^>\[!(NOTE|TIP|IMPORTANT|CAUTION|WARNING|ADMINISTRATION|AVAILABILITY|PREREQUISITES|ERROR|INFO|SUCCESS|VIDEO|MORELIKETHIS)\]/gm; //identify valid alert types (all caps)
module.exports.bracketExclam = /^\[!/gm; //identify syntax beginning with "[!" at the start of a line
module.exports.alertTypeNoOpen = /^\[!(NOTE|TIP|IMPORTANT|CAUTION|WARNING|ADMINISTRATION|AVAILABILITY|PREREQUISITES|ERROR|INFO|SUCCESS|VIDEO|MORELIKETHIS)\]/gm; //identify attempted alerts not preceded by "> "
module.exports.alertNoExclam = /\[(NOTE|TIP|IMPORTANT|CAUTION|WARNING|ADMINISTRATION|AVAILABILITY|PREREQUISITES|ERROR|INFO|SUCCESS|VIDEO|MORELIKETHIS)\]/gm; //identify alerts missing !

// Video
module.exports.syntaxVideoLooseMatch = /(:+)\s*video\s*(((.*)?="(.*?)")?(.:+)?)?/gim;
module.exports.videoOpen = /:::video/gim;
module.exports.videoSourceMatch = /source\s*=\s*"(.*?)"/m;
module.exports.videoTitleMatch = /title\s*=\s*"(.*?)"/m;
module.exports.videoMaxWidthMatch = /max-width\s*=\s*"(.*?)"/m;
module.exports.allowedVideoAttributes = ['source', 'title', 'max-width'];

// DNL - Do Not Localize
module.exports.dnlOpener = /\[!DNL/;
module.exports.dnlPattern = /\[!DNL\s+([^\]]*)\]/;
module.exports.dnlNoContent = /\[!DNL\s*\]/;
module.exports.dnlNoExclam = /\[DNL([^\]]*)\]/;
module.exports.dnlCase = /\[!dnl/i; // Case-insensitive match for [!dnl]

// UICONTROL - Localize UI
module.exports.uicontrolOpener = /\[!UICONTROL/;
module.exports.uicontrolPattern = /\[!UICONTROL\s+([^\]]*)\]/;
module.exports.uicontrolNoContent = /\[!UICONTROL\s*\]/;
module.exports.uicontrolNoExclam = /\[UICONTROL([^\]]*)\]/;
module.exports.uicontrolCase = /\[!uicontrol/i; // Case-insensitive match for [!uicontrol]
