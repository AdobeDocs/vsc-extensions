import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Inline code", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleInlineCode",
      "Lets make a «fancy≥ text!",
      "Lets make a «`fancy`≥ text!"
    );
  });

  test("Collapsed selection", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleInlineCode",
      "Lets make a fan•cy text!",
      "Lets make a «`fancy`≥ text!"
    );
  });

  test("Collapsed selection with unicode selection", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleInlineCode",
      "Lets make a fÄn•cy text!",
      "Lets make a «`fÄncy`≥ text!"
    );
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleInlineCode",
      "Lets make less `fa•ncy` text",
      "Lets make less «fancy≥ text"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleInlineCode",
      "Lets make less «`fancy`≥ text",
      "Lets make less «fancy≥ text"
    );
  });
});