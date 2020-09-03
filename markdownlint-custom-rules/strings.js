// Alert
module.exports.alertType = `Bad alert type. Only NOTE, TIP, IMPORTANT, CAUTION, and WARNING are supported. Case-sensitive.`;
module.exports.alertNoOpen = `Missing block opener. Notes must be preceded by ">".`;
module.exports.alertNoExclam = `Bad alert syntax. Notes must include exclamation point within brackets, such as "> [!NOTE]"`;
module.exports.alertWithSpace = `Alerts must not include space between ">" and "[!"`;
