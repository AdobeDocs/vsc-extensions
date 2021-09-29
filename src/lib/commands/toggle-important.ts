import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingImportant = ">[!IMPORTANT]" + newLine + ">" + newLine + ">";
const endingImportant = newLine;
const importantBlockWordPattern = new RegExp(
  startingImportant + ".+" + endingImportant + "|.+",
  "gm"
);

export function toggleImportant() {
  return surroundBlockSelection(
    startingImportant,
    endingImportant,
    importantBlockWordPattern
  );
}
