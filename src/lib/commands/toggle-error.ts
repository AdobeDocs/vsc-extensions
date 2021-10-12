import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingError: string = `>[!ERROR]${newLine}>${newLine}>`;
const endingError: string = newLine;
const errorBlockWordPattern: RegExp = new RegExp(
  startingError + ".+" + endingError + "|.+",
  "gm"
);

export function toggleError() {
  return surroundBlockSelection(
    startingError,
    endingError,
    errorBlockWordPattern
  );
}
