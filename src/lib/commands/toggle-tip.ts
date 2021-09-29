import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingTip: string = ">[!TIP]" + newLine + ">" + newLine + ">";
const endingTip: string = newLine;
const tipBlockWordPattern: RegExp = new RegExp(
  startingTip + ".+" + endingTip + "|.+",
  "gm"
);

export function toggleTip() {
  return surroundBlockSelection(startingTip, endingTip, tipBlockWordPattern);
}
