import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingAdministration: string = `>[!ADMINISTRATION]${newLine}>${newLine}>`;
const endingAdministration: string = newLine;
const administrationBlockWordPattern: RegExp = new RegExp(
    startingAdministration + ".+" + endingAdministration + "|.+",
    "gm"
);

export function toggleAdministration() {
    return surroundBlockSelection(startingAdministration, endingAdministration, administrationBlockWordPattern);
}