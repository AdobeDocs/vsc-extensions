import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Headers", () => {
  // For headers we'll generate the tests, so that this test suite doesn't get too bloat.
  for (let i = 1; i <= 6; i++) {
    suite("Level " + i, () => {
      var headerMarker = "#".repeat(i);

      test("Ranged selection", () => {
        return testCommand(
          `toggleTitleH${i}`,
          "Lets make a «fancy≥ text!",
          `Lets make a «${headerMarker} fancy≥ text!`
        );
      });

      test("Collapsed selection", () => {
        // This is likely to be changed with #5.
        return testCommand(
          `toggleTitleH${i}`,
          "Lets make a fan•cy text!",
          `«${headerMarker} Lets make a fancy text!≥`
        );
      });

      test("Collapsed selection with newline", () => {
        // This is likely to be changed with #5.
        return testCommand(
          `toggleTitleH${i}`,
          "Lets make a fan•cy text!\nAnother line",
          `«${headerMarker} Lets make a fancy text!≥\nAnother line`
        );
      });

      test("Toggles with ranged selection", () => {
        return testCommand(
          `toggleTitleH${i}`,
          `«${headerMarker} Lets make less fancy text≥`,
          "«Lets make less fancy text≥"
        );
      });

      test("Toggles with collapsed selection", () => {
        return testCommand(
          `toggleTitleH${i}`,
          `${headerMarker} Lets make •less fancy text`,
          "«Lets make less fancy text≥"
        );
      });
    });
  }
});