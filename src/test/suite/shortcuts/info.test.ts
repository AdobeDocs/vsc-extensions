import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Info Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleInfo",
      "«This is just a plain tip≥",
      "«>[!INFO]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleInfo",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!INFO]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleInfo",
      "«This is just a" + NEWLINE + "plain tip≥" + NEWLINE,
      "«>[!INFO]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleInfo",
      "«This is just a" + NEWLINE + "plain tip" + NEWLINE + "≥",
      "«>[!INFO]\n>\n>This is just a\nplain tip\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleInfo",
      "Just a plain tip•",
      "«>[!INFO]\n>\n>Just a plain tip\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleInfo",
      "«This is just a plain tip≥",
      "«>[!INFO]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleInfo",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!INFO]\n>\n>This is just a\nplain tip\n≥"
    );
  });
});
