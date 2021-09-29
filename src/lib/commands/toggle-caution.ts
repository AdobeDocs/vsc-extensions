import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingCaution: string = ">[!CAUTION]" + newLine + ">" + newLine + ">";
const endingCaution: string = newLine;
const cautionBlockWordPattern: RegExp = new RegExp(
    startingCaution + ".+" + endingCaution + "|.+",
    "gm"
);
export function toggleCaution() {
    return surroundBlockSelection(
        startingCaution,
        endingCaution,
        cautionBlockWordPattern
    );
}