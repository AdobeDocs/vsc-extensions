import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingShadebox = `>[!BEGINSHADEBOX]${newLine}${newLine}`;
const endingShadebox = `${newLine}${newLine}>[!ENDSHADEBOX]`;
const shadeboxPattern = new RegExp(startingShadebox + ".+" + endingShadebox + "|.+", "gm");

export function toggleShadebox() {
  return surroundBlockSelection(
    startingShadebox,
    endingShadebox,
    shadeboxPattern,
    `>[!BEGINSHADEBOX "\${1:Title}"]\n\n\${2:Content.}\n\n>[!ENDSHADEBOX]\n$0`
  );
}
