import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Important Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleImportant",
      "«This is just a plain important≥",
      "«>[!IMPORTANT]\n>\n>This is just a plain important\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleImportant",
      "«This is just a" + NEWLINE + "plain important≥",
      "«>[!IMPORTANT]\n>\n>This is just a\nplain important\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleImportant",
      "«This is just a" + NEWLINE + "plain important≥" + NEWLINE,
      "«>[!IMPORTANT]\n>\n>This is just a\nplain important\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleImportant",
      "«This is just a" + NEWLINE + "plain important" + NEWLINE + "≥",
      "«>[!IMPORTANT]\n>\n>This is just a\nplain important\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleImportant",
      "Just a plain important•",
      "«>[!IMPORTANT]\n>\n>Just a plain important\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleImportant",
      "«This is just a plain important≥",
      "«>[!IMPORTANT]\n>\n>This is just a plain important\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleImportant",
      "«This is just a" + NEWLINE + "plain important≥",
      "«>[!IMPORTANT]\n>\n>This is just a\nplain important\n≥"
    );
  });
});