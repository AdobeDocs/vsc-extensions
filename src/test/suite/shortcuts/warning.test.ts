import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Warning Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleWarning",
      "«This is just a plain warning≥",
      "«>[!WARNING]\n>\n>This is just a plain warning\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleWarning",
      "«This is just a" + NEWLINE + "plain warning≥",
      "«>[!WARNING]\n>\n>This is just a\nplain warning\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleWarning",
      "«This is just a" + NEWLINE + "plain warning≥" + NEWLINE,
      "«>[!WARNING]\n>\n>This is just a\nplain warning\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleWarning",
      "«This is just a" + NEWLINE + "plain warning" + NEWLINE + "≥",
      "«>[!WARNING]\n>\n>This is just a\nplain warning\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleWarning",
      "Just a plain warning•",
      "«>[!WARNING]\n>\n>Just a plain warning\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleWarning",
      "«This is just a plain warning≥",
      "«>[!WARNING]\n>\n>This is just a plain warning\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleWarning",
      "«This is just a" + NEWLINE + "plain warning≥",
      "«>[!WARNING]\n>\n>This is just a\nplain warning\n≥"
    );
  });
});