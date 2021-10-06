import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingPrerequisites: string = `>[!PREREQUISITES]${newLine}>${newLine}>`;
const endingPrerequisites: string = newLine;
const prerequisitesBlockWordPattern: RegExp = new RegExp(
  startingPrerequisites + ".+" + endingPrerequisites + "|.+",
  "gm"
);
export function togglePrerequisites() {
  return surroundBlockSelection(
    startingPrerequisites,
    endingPrerequisites,
    prerequisitesBlockWordPattern
  );
}
