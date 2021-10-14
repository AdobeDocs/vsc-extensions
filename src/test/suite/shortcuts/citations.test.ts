import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Citations", () => {
  test("Collapsed selection", () => {
    return testCommand(
      "toggleCitations",
      "A line for ci•tation",
      "«> A line for citation≥"
    );
  });

  test("Ranged selection", () => {
    return testCommand(
      "toggleCitations",
      "A li«st\nOf Citatio≥ns",
      "> A li«st\n> Of Citatio≥ns"
    );
  });

  test("Ranged selection with blank lines", () => {
    return testCommand(
      "toggleCitations",
      "A li«st\n\n\nOf Citatio≥ns",
      "> A li«st\n> \n> \n> Of Citatio≥ns"
    );
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleCitations",
      "> A line for ci•tation",
      "«A line for citation≥"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleCitations",
      "> A norm«al citatio≥n",
      "A normal« citation≥"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleCitations",
      "> A li«st\n> Of Citatio≥ns",
      "A list«\nOf Citations≥"
    );
  });
});