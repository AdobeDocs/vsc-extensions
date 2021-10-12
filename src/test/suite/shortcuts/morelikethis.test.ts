import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Morelikethis Tags", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleMoreLikeThis",
      "«This is just a plain morelikethis≥",
      "«>[!MORELIKETHIS]\n>\n>This is just a plain morelikethis\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleMoreLikeThis",
      "«This is just a" + NEWLINE + "plain morelikethis≥",
      "«>[!MORELIKETHIS]\n>\n>This is just a\nplain morelikethis\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleMoreLikeThis",
      "«This is just a" + NEWLINE + "plain morelikethis≥" + NEWLINE,
      "«>[!MORELIKETHIS]\n>\n>This is just a\nplain morelikethis\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleMoreLikeThis",
      "«This is just a" + NEWLINE + "plain morelikethis" + NEWLINE + "≥",
      "«>[!MORELIKETHIS]\n>\n>This is just a\nplain morelikethis\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleMoreLikeThis",
      "Just a plain morelikethis•",
      "«>[!MORELIKETHIS]\n>\n>Just a plain morelikethis\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleMoreLikeThis",
      "[>[!MORELIKETHIS]" +
        NEWLINE +
        ">" +
        NEWLINE +
        ">This is just a plain morelikethis" +
        NEWLINE +
        "}",
      "«This is just a plain morelikethis≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleMoreLikeThis",
      "[>[!MORELIKETHIS]" +
        NEWLINE +
        ">" +
        NEWLINE +
        ">This is just a" +
        NEWLINE +
        "plain morelikethis}",
      "«This is just a\nplain morelikethis≥"
    );
  });
});