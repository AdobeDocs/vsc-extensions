import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Tip Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleTip",
      "«This is just a plain tip≥",
      "«>[!TIP]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleTip",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!TIP]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleTip",
      "«This is just a" + NEWLINE + "plain tip≥" + NEWLINE,
      "«>[!TIP]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleTip",
      "«This is just a" + NEWLINE + "plain tip" + NEWLINE + "≥",
      "«>[!TIP]\n>\n>This is just a\nplain tip\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleTip",
      "Just a plain tip•",
      "«>[!TIP]\n>\n>Just a plain tip\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleTip",
      "«This is just a plain tip≥",
      "«>[!TIP]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleTip",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!TIP]\n>\n>This is just a\nplain tip\n≥"
    );
  });
});
