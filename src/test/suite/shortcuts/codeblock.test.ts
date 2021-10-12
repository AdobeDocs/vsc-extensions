import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Block code", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "«some code≥",
      "«```\nsome code\n```≥"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "«some code" + NEWLINE + "more code≥",
      "«```\nsome code\nmore code\n```≥"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleCodeBlock",
      "«some code" + NEWLINE + "more code≥" + NEWLINE,
      "«```\nsome code\nmore code\n```≥"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleCodeBlock",
      "«some code" + NEWLINE + "more code" + NEWLINE + "≥",
      "«```\nsome code\nmore code\n\n```≥"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "Some code•",
      "«```\nSome code\n```≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "«```\nsome code\n```≥",
      "«some code≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "«```" + NEWLINE + "some code" + NEWLINE + "more code" + NEWLINE + "```≥",
      "«some code\nmore code≥"
    );
  });

  //TODO: are these possible?
  // test( "Toggles with collapsed selection", () => {
  //     return testCommand( 'toggleCodeBlock', '```' + NEWLINE + 'some• code' + NEWLINE + '```', '«some code≥' );
  // } );

  // test( "Toggles with multiline collapsed selection", () => {
  //     return testCommand( 'toggleCodeBlock', '```' + NEWLINE + 'some• code' + NEWLINE + 'more code' + NEWLINE + '```', '«some code\nmore code≥' );
  // } );
});