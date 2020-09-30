const common = require("./common");
const detailStrings = require("./strings");

module.exports = {
  names: ["AM020", "adobe.uicontrol"],
  description: `Localization control [!UICONTROL]`,
  tags: ["validation", "adobe", "localization"],
  function: function am020(params, onError) {
    const inlineTokens = params.tokens.filter((tok) => tok.type === "inline");
    inlineTokens.forEach((token) => {
      const kids = token.children;
      kids.forEach((kid) => {
        const { content } = kid;
        if (content) {
          // UICONTROL Uppercase
          const uicontrolCaseMatch = content.match(common.uicontrolCase);
          if (uicontrolCaseMatch) {
            if (uicontrolCaseMatch[0] !== "[!UICONTROL") {
              onError({
                lineNumber: kid.lineNumber,
                detail: detailStrings.uicontrolCase,
                context: kid.line,
                range: [
                  uicontrolCaseMatch.index + 1,
                  uicontrolCaseMatch[0].length,
                ],
              });
            }
          }
          // UICONTROL has no text
          const uicontrolNoContentMatch = content.match(
            common.uicontrolNoContent
          );
          if (uicontrolNoContentMatch) {
            onError({
              lineNumber: kid.lineNumber,
              detail: detailStrings.uicontrolNoContent,
              context: kid.line,
              range: [
                uicontrolNoContentMatch.index + 1,
                uicontrolNoContentMatch[0].length,
              ],
            });
          }
          // !UICONTROL missing !
          const uicontrolNoExclam = content.match(common.uicontrolNoExclam);
          if (uicontrolNoExclam) {
            onError({
              lineNumber: kid.lineNumber,
              detail: detailStrings.uicontrolNoExclam,
              context: kid.line,
              range: [uicontrolNoExclam.index + 1, uicontrolNoExclam[0].length],
            });
          }
        }
      });
    });
  },
};
