import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
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
