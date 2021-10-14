import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Prerequisites Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "togglePrerequisites",
      "«This is just a plain tip≥",
      "«>[!PREREQUISITES]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "togglePrerequisites",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!PREREQUISITES]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "togglePrerequisites",
      "«This is just a" + NEWLINE + "plain tip≥" + NEWLINE,
      "«>[!PREREQUISITES]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "togglePrerequisites",
      "«This is just a" + NEWLINE + "plain tip" + NEWLINE + "≥",
      "«>[!PREREQUISITES]\n>\n>This is just a\nplain tip\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "togglePrerequisites",
      "Just a plain tip•",
      "«>[!PREREQUISITES]\n>\n>Just a plain tip\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "togglePrerequisites",
      "«This is just a plain tip≥",
      "«>[!PREREQUISITES]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "togglePrerequisites",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!PREREQUISITES]\n>\n>This is just a\nplain tip\n≥"
    );
  });
});
