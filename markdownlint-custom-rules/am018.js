"use strict";

const common = require("./common");
const detailStrings = require("./strings");
const schemas = require("./schemas");

// schema linting
let allowedVideoAttributes;
let videoDataResponse = Object.keys(schemas.VIDEO_SCHEMA.properties);

function loadVideoSchema() {
  videoDataResponse = schemas.VIDEO_SCHEMA.properties;
  allowedVideoAttributes = Object.keys(videoDataResponse);
}

loadVideoSchema();

module.exports = {
  names: ["AM018", "adobe.video"],
  description: `video linting.`,
  tags: ["validation", "adobe", "video"],
  function: function am018(params, onError) {
    const doc = params.lines.join("\n");
    const fullLooseMatches = doc.match(common.syntaxVideoLooseMatch);
    params.tokens
      .filter(function filterToken(token) {
        return token.type === "inline";
      })
      .forEach(function forToken(inline) {
        inline.children
          .filter(function filterChild(child) {
            return child.type === "text";
          })
          .forEach(function forChild(text) {
            const textBlock = text.content;
            const videoMatches = textBlock.match(common.syntaxVideoLooseMatch);
            if (videoMatches === null) {
              return;
            }
            videoMatches.forEach((videoMatch) => {
              const content = fullLooseMatches.filter((match) =>
                match.includes(videoMatch)
              )[0];
              if (content) {
                //malformed colons
                if (!content.match(common.openAndClosingValidTripleColon)) {
                  onError({
                    lineNumber: text.lineNumber,
                    detail: detailStrings.tripleColonsIncorrect,
                    context: text.line,
                  });
                }

                //source check
                const sourceMatch = common.videoSourceMatch.exec(content);
                if (!sourceMatch || sourceMatch[1] === "") {
                  onError({
                    lineNumber: text.lineNumber,
                    detail: detailStrings.videoSourceRequired,
                    context: text.line,
                  });
                }
                if (sourceMatch) {
                  const source = sourceMatch[1];
                  if (
                    !source.includes("channel9.msdn.com") &&
                    !source.includes("youtube.com/embed") &&
                    !source.includes("microsoft.com/en-us/videoplayer/embed")
                  ) {
                    onError({
                      lineNumber: text.lineNumber,
                      detail: detailStrings.videoSourceUrl,
                      context: text.line,
                    });
                  }
                  if (
                    source.includes("channel9.msdn.com") &&
                    !source.includes("/player")
                  ) {
                    onError({
                      lineNumber: text.lineNumber,
                      detail: detailStrings.videoChannel9,
                      context: text.line,
                    });
                  }
                }
                const attributeMatches = content.match(
                  common.AttributeMatchGlobal
                );
                if (attributeMatches && attributeMatches.length > 0) {
                  attributeMatches.forEach((attributeMatch) => {
                    const match = common.AttributeMatch.exec(attributeMatch);
                    const attr = match[1];
                    if (allowedVideoAttributes) {
                      const attributeInAllowedList = allowedVideoAttributes.includes(
                        attr.toLowerCase()
                      );
                      if (!attributeInAllowedList) {
                        onError({
                          lineNumber: text.lineNumber,
                          detail: detailStrings.videoNonAllowedAttribute.replace(
                            "___",
                            attr
                          ),
                          context: text.line,
                        });
                      } else {
                        const attributeNotMatchCasing = allowedVideoAttributes.includes(
                          attr
                        );
                        if (!attributeNotMatchCasing) {
                          onError({
                            lineNumber: text.lineNumber,
                            detail: detailStrings.videoCaseSensitive.replace(
                              "___",
                              attr
                            ),
                            context: text.line,
                          });
                        }
                      }
                    }
                  });
                }
              }
            });
          });
      });
  },
};
