import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Success Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleSuccess",
      "«This is just a plain tip≥",
      "«>[!SUCCESS]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleSuccess",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!SUCCESS]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleSuccess",
      "«This is just a" + NEWLINE + "plain tip≥" + NEWLINE,
      "«>[!SUCCESS]\n>\n>This is just a\nplain tip\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleSuccess",
      "«This is just a" + NEWLINE + "plain tip" + NEWLINE + "≥",
      "«>[!SUCCESS]\n>\n>This is just a\nplain tip\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleSuccess",
      "Just a plain tip•",
      "«>[!SUCCESS]\n>\n>Just a plain tip\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleSuccess",
      "«This is just a plain tip≥",
      "«>[!SUCCESS]\n>\n>This is just a plain tip\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleSuccess",
      "«This is just a" + NEWLINE + "plain tip≥",
      "«>[!SUCCESS]\n>\n>This is just a\nplain tip\n≥"
    );
  });
});
