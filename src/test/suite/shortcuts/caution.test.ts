import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Caution Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleCaution",
      "«This is just a plain caution≥",
      "«>[!CAUTION]\n>\n>This is just a plain caution\n≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleCaution",
      "«This is just a" + NEWLINE + "plain caution≥",
      "«>[!CAUTION]\n>\n>This is just a\nplain caution\n≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleCaution",
      "«This is just a" + NEWLINE + "plain caution≥" + NEWLINE,
      "«>[!CAUTION]\n>\n>This is just a\nplain caution\n≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleCaution",
      "«This is just a" + NEWLINE + "plain caution" + NEWLINE + "≥",
      "«>[!CAUTION]\n>\n>This is just a\nplain caution\n\n≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleCaution",
      "Just a plain caution•",
      "«>[!CAUTION]\n>\n>Just a plain caution\n≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleCaution",
      "«This is just a plain caution≥",
      "«>[!CAUTION]\n>\n>This is just a plain caution\n≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleCaution",
      "«This is just a" + NEWLINE + "plain caution≥",
      "«>[!CAUTION]\n>\n>This is just a\nplain caution\n≥"
    );
  });
});