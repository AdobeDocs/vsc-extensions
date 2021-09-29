import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

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
