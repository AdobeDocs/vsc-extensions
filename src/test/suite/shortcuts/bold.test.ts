import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Bold", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleBold",
      "Lets make a «bold≥ text!",
      "Lets make a «**bold**≥ text!"
    );
  });

  test("Collapsed selection", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleBold",
      "Lets make a bo•ld text!",
      "Lets make a «**bold**≥ text!"
    );
  });

  test("Collapsed selection with unicode characters", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleBold",
      "Lets make a bÔ•ld text!",
      "Lets make a «**bÔld**≥ text!"
    );
  });

  test("Collapsed selection empty editor", () => {
    // make sure nothing wrong happens when the editor is totally empty.
    return testCommand("toggleBold", "•", "**•**");
  });

  test("Collapsed selection empty surround editor", () => {
    // make sure nothing wrong happens when the editor is surrounded by bold.
    return testCommand("toggleBold", "**•**", "•");
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleBold",
      "Time to **unbo•ld** this statement",
      "Time to «unbold≥ this statement"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleBold",
      "Time to «**unbold**≥ this statement",
      "Time to «unbold≥ this statement"
    );
  });
});