import { newLine, wordMatch } from "../commands";
import { surroundBlockSelection, surroundSelection } from "../editorHelpers";

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