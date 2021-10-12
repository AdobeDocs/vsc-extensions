import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingNote: string = `>[!NOTE]${newLine}>${newLine}>`;
const endingNote: string = newLine;
const noteBlockWordPattern: RegExp = new RegExp(
  startingNote + ".+" + endingNote + "|.+",
  "gm"
);

export function toggleNote() {
  return surroundBlockSelection(startingNote, endingNote, noteBlockWordPattern);
}
