import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingCollapsible = `+++`;
const endingCollapsible = `${newLine}+++`;
const collapsiblePattern = new RegExp("\\+\\+\\+.+\\+\\+\\+|.+", "gm");

export function toggleCollapsible() {
  return surroundBlockSelection(
    startingCollapsible,
    endingCollapsible,
    collapsiblePattern,
    `+++\${1:Title}\n\n\${2:Content.}\n\n+++\n$0`
  );
}
