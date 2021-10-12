import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingSuccess: string = `>[!SUCCESS]${newLine}>${newLine}>`;
const endingSuccess: string = newLine;
const successBlockWordPattern: RegExp = new RegExp(
  startingSuccess + ".+" + endingSuccess + "|.+",
  "gm"
);
export function toggleSuccess() {
  return surroundBlockSelection(
    startingSuccess,
    endingSuccess,
    successBlockWordPattern
  );
}
