import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingWarning: string = ">[!WARNING]" + newLine + ">" + newLine + ">";
const endingWarning = newLine;
const warningBlockWordPattern = new RegExp(
  startingWarning + ".+" + endingWarning + "|.+",
  "gm"
);
export function toggleWarning() {
  return surroundBlockSelection(
    startingWarning,
    endingWarning,
    warningBlockWordPattern
  );
}
