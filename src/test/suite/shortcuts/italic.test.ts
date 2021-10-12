import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Italic", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleItalic",
      "Lets make a «fancy≥ text!",
      "Lets make a «_fancy_≥ text!"
    );
  });

  // test( "Collapsed selection", () => {
  //     // This is likely to be changed with #5.
  //     return testCommand( 'toggleItalic', 'Lets make a fan•cy text!', 'Lets make a «_fancy_≥ text!' );
  // } );

  // test( "Collapsed selection with unicode characters", () => {
  //     // This is likely to be changed with #5.
  //     return testCommand( 'toggleItalic', 'Lets make a fÄn•cy text!', 'Lets make a «_fÄncy_≥ text!' );
  // } );

  // test( "Toggles with collapsed selection", () => {
  //     return testCommand( 'toggleItalic', 'Lets make less _fan•cy_ text', 'Lets make less «fancy≥ text' );
  // } );

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleItalic",
      "Lets make less «_fancy_≥ text",
      "Lets make less «fancy≥ text"
    );
  });
});