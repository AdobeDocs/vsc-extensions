import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingInfo: string = `>[!INFO]${newLine}>${newLine}>`;
const endingInfo: string = newLine;
const infoBlockWordPattern: RegExp = new RegExp(
  startingInfo + ".+" + endingInfo + "|.+",
  "gm"
);
export function toggleInfo() {
  return surroundBlockSelection(startingInfo, endingInfo, infoBlockWordPattern);
}
