import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingTabs = `>[!BEGINTABS]${newLine}${newLine}>[!TAB Tab 1]${newLine}${newLine}`;
const endingTabs = `${newLine}${newLine}>[!ENDTABS]`;
const tabsPattern = new RegExp(startingTabs + ".+" + endingTabs + "|.+", "gm");

export function toggleTabs() {
  return surroundBlockSelection(
    startingTabs,
    endingTabs,
    tabsPattern,
    `>[!BEGINTABS]\n\n>[!TAB \${1:Tab 1}]\n\n\${2:Content.}\n\n>[!TAB \${3:Tab 2}]\n\n\${4:Content.}\n\n>[!ENDTABS]\n$0`
  );
}
