import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Availability Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleAvailability",
      "«This is just a plain availability tag≥",
      "«>[!AVAILABILITY]\n>\n>This is just a plain availability tag\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleAvailability",
      "«This is just a" + NEWLINE + "plain availability tag≥",
      "«>[!AVAILABILITY]\n>\n>This is just a\nplain availability tag\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleAvailability",
      "«This is just a" + NEWLINE + "plain availability tag≥" + NEWLINE,
      "«>[!AVAILABILITY]\n>\n>This is just a\nplain availability tag\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleAvailability",
      "«This is just a" + NEWLINE + "plain availability tag" + NEWLINE + "≥",
      "«>[!AVAILABILITY]\n>\n>This is just a\nplain availability tag\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleAvailability",
      "Just a plain availability tag•",
      "«>[!AVAILABILITY]\n>\n>Just a plain availability tag\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleAvailability",
      "«This is just a plain availability tag≥",
      "«>[!AVAILABILITY]\n>\n>This is just a plain availability tag\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleAvailability",
      "«This is just a" + NEWLINE + "plain availability tag≥",
      "«>[!AVAILABILITY]\n>\n>This is just a\nplain availability tag\n≥"
    );
  });
});
