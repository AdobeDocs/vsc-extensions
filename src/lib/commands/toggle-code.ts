import { surroundBlockSelection, surroundSelection } from "../editorHelpers";
import { getEol } from "../env";

const newLine = getEol();

const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
const startingBlock: string = "```" + newLine;
const endingBlock: string = newLine + "```";
const codeBlockWordPattern: RegExp = new RegExp(
  `${startingBlock}.+${endingBlock}|.+`,
  "gm"
);
export function toggleCodeBlock() {
  return surroundBlockSelection(
    startingBlock,
    endingBlock,
    codeBlockWordPattern
  );
}

const toggleInlineCodePattern = new RegExp(
  "`" + wordMatch + "*`|" + wordMatch + "+"
);
export function toggleInlineCode() {
  return surroundSelection("`", "`", toggleInlineCodePattern);
}
