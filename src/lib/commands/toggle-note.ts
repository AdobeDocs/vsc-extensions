import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingNote: string = `>[!NOTE]${newLine}>${newLine}>`;
const endingNote: string = newLine;
const noteBlockWordPattern: RegExp = new RegExp(
  startingNote + ".+" + endingNote + "|.+",
  "gm"
);

export function toggleNote() {
  return surroundBlockSelection(startingNote, endingNote, noteBlockWordPattern);
}
