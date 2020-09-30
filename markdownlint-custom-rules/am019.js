const common = require("./common");
const detailStrings = require("./strings");

module.exports = {
  names: ["AM019", "adobe.dnl"],
  description: `Do Not Localize linting [!DNL]`,
  tags: ["validation", "adobe", "localization"],
  function: function am019(params, onError) {
    const inlineTokens = params.tokens.filter((tok) => tok.type === "inline");
    inlineTokens.forEach((token) => {
      const kids = token.children;
      kids.forEach((kid) => {
        const { content } = kid;
        if (content) {
          // DNL Uppercase
          const dnlCaseMatch = content.match(common.dnlCase);
          if (dnlCaseMatch) {
            if (dnlCaseMatch[0] !== "[!DNL") {
              onError({
                lineNumber: kid.lineNumber,
                detail: detailStrings.dnlCase,
                context: kid.line,
                range: [dnlCaseMatch.index + 1, dnlCaseMatch[0].length],
              });
            }
          }
          // DNL has no text
          const dnlNoContentMatch = content.match(common.dnlNoContent);
          if (dnlNoContentMatch) {
            onError({
              lineNumber: kid.lineNumber,
              detail: detailStrings.dnlNoContent,
              context: kid.line,
              range: [dnlNoContentMatch.index + 1, dnlNoContentMatch[0].length],
            });
          }
          // !DNL missing !
          const dnlNoExclam = content.match(common.dnlNoExclam);
          if (dnlNoExclam) {
            onError({
              lineNumber: kid.lineNumber,
              detail: detailStrings.dnlNoExclam,
              context: kid.line,
              range: [dnlNoExclam.index + 1, dnlNoExclam[0].length],
            });
          }
        }
      });
    });
  },
};
