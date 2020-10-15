// Alert
module.exports.alertType = `Bad alert type. Only ADMIN, AVAILABILITY, CAUTION, IMPORTANT, NOTE, PREREQUISITES, TIP, and WARNING are supported. Case-sensitive.`;
module.exports.alertNoOpen = `Missing block opener. Notes must be preceded by ">".`;
module.exports.alertNoExclam = `Bad alert syntax. Notes must include exclamation point within brackets, such as "> [!NOTE]"`;
module.exports.alertWithSpace = `Alerts must not include space between ">" and "[!"`;

// Video

module.exports.tripleColonsIncorrect = 'Triple colons are incorrect';
module.exports.videoSourceRequired = 'Video source is required';
module.exports.videoSourceUrl = 'Malformed Video Source URL';
module.exports.videoChannel9 = 'Channel 9 Error';
module.exports.videoNonAllowedAttribute = 'Attribute is not permitted';
module.exports.videoCaseSensitive =
  'VIDEO tag is case-sensitive. Must be all caps [!VIDEO';

// DNL
module.exports.dnlCase = '[!DNL] directive must be in upper case.';
module.exports.dnlNoContent = 'Must have content text to hide from localizer.';
module.exports.dnlNoExclam = 'No exclamation mark before DNL directive.';

// UICONTROL

// UICONTROL
module.exports.uicontrolCase = '[!UICONTROL] directive must be in upper case.';
module.exports.uicontrolNoContent = 'Must have content text to localize.';
module.exports.uicontrolNoExclam =
  'No exclamation mark before UICONTROL directive.';
