import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingTip: string = ">[!TIP]" + newLine + ">" + newLine + ">";
const endingTip: string = newLine;
const tipBlockWordPattern: RegExp = new RegExp(
  startingTip + ".+" + endingTip + "|.+",
  "gm"
);

export function toggleTip() {
  return surroundBlockSelection(startingTip, endingTip, tipBlockWordPattern);
}
