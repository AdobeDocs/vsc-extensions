import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Error Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleError",
      "«This is just a plain error tag≥",
      "«>[!ERROR]\n>\n>This is just a plain error tag\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleError",
      "«This is just a" + NEWLINE + "plain error tag≥",
      "«>[!ERROR]\n>\n>This is just a\nplain error tag\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleError",
      "«This is just a" + NEWLINE + "plain error tag≥" + NEWLINE,
      "«>[!ERROR]\n>\n>This is just a\nplain error tag\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleError",
      "«This is just a" + NEWLINE + "plain error tag" + NEWLINE + "≥",
      "«>[!ERROR]\n>\n>This is just a\nplain error tag\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleError",
      "Just a plain error tag•",
      "«>[!ERROR]\n>\n>Just a plain error tag\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleError",
      "«This is just a plain error tag≥",
      "«>[!ERROR]\n>\n>This is just a plain error tag\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleError",
      "«This is just a" + NEWLINE + "plain error tag≥",
      "«>[!ERROR]\n>\n>This is just a\nplain error tag\n≥"
    );
  });
});
