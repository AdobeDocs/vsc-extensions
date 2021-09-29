import { newLine } from "../commands";
import { surroundBlockSelection } from "../editorHelpers";

const startingAvailability: string = `>[!AVAILABILITY]${newLine}>${newLine}>`;
const endingAvailability: string = newLine;
const availabilityBlockWordPattern: RegExp = new RegExp(
    startingAvailability + ".+" + endingAvailability + "|.+",
    "gm"
);
export function toggleAvailability() {
    return surroundBlockSelection(startingAvailability, endingAvailability, availabilityBlockWordPattern);
}
