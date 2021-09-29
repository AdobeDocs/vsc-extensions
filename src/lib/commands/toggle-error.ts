import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingError: string = `>[!ERROR]${newLine}>${newLine}>`;
const endingError: string = newLine;
const errorBlockWordPattern: RegExp = new RegExp(
    startingError + ".+" + endingError + "|.+",
    "gm"
);

export function toggleError() {
    return surroundBlockSelection(startingError, endingError, errorBlockWordPattern);
}