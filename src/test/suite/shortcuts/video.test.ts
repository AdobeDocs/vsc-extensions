import { getEol } from "../../../lib/env";
import { testCommand } from "../shortcuts.test";

const NEWLINE = getEol();

suite("Video Alerts", () => {
  test("Video with selected URL", () => {
    return testCommand(
      "toggleVideo",
      "«https://www.youtube.com/watch?v=F_7ZoAQ3aJM≥",
      "«>[!VIDEO](https://www.youtube.com/watch?v=F_7ZoAQ3aJM)≥"
    );
  });

  test("No selection inside a VIDEO tag.", () => {
    return testCommand(
      "toggleVideo",
      ">[!VIDEO](https://www.youtube.com/watch?v=F_7ZoAQ3aJM)",
      "«https://www.youtube.com/watch?v=F_7ZoAQ3aJM≥"
    );
  });

  test("Selection anywhere in VIDEO tag", () => {
    return testCommand(
      "toggleVideo",
      ">[!VIDEO](https://www.«youtube≥.com/watch?v=F_7ZoAQ3aJM)",
      "«https://www.youtube.com/watch?v=F_7ZoAQ3aJM≥"
    );
  });

  test("No Selection in plain text with a URL", () => {
    return testCommand(
      "toggleVideo",
      "Just some text with a url https://www.youtube.com/watch?v=F_7ZoAQ3aJM embedded in it.",
      "«>[!VIDEO](https://www.youtube.com/watch?v=F_7ZoAQ3aJM) Just some text with a url https://www.youtube.com/watch?v=F_7ZoAQ3aJM embedded in it.≥"
    );
  });
});