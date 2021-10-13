import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Bullets", () => {
  // beforeEach(() => {
  // });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleBullets",
      "A line for bul•lets",
      "«* A line for bullets≥"
    );
  });

  test("Ranged selection", () => {
    return testCommand(
      "toggleBullets",
      "A li«st\nOf Ite≥ms",
      "* A «list\n* Of≥ Items"
    );
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleBullets",
      "* A line for bul•lets",
      "«A line for bullets≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleBullets",
      "* A bullet«ed li≥st",
      "A bulleted« list≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleBullets",
      "* A li«st\n* Of Ite≥ms",
      "A list«\nOf Items≥"
    );
  });
});