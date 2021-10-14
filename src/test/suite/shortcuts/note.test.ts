import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Note Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleNote",
      "«This is just a plain note≥",
      "«>[!NOTE]\n>\n>This is just a plain note\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleNote",
      "«This is just a" + NEWLINE + "plain note≥",
      "«>[!NOTE]\n>\n>This is just a\nplain note\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleNote",
      "«This is just a" + NEWLINE + "plain note≥" + NEWLINE,
      "«>[!NOTE]\n>\n>This is just a\nplain note\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleNote",
      "«This is just a" + NEWLINE + "plain note" + NEWLINE + "≥",
      "«>[!NOTE]\n>\n>This is just a\nplain note\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleNote",
      "Just a plain note•",
      "«>[!NOTE]\n>\n>Just a plain note\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleNote",
      "«This is just a plain note≥",
      "«>[!NOTE]\n>\n>This is just a plain note\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleNote",
      "«This is just a" + NEWLINE + "plain note≥",
      "«>[!NOTE]\n>\n>This is just a\nplain note\n≥"
    );
  });
});