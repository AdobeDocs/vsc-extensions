import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();
const startingAvailability: string = `>[!AVAILABILITY]${newLine}>${newLine}>`;
const endingAvailability: string = newLine;
const availabilityBlockWordPattern: RegExp = new RegExp(
  startingAvailability + ".+" + endingAvailability + "|.+",
  "gm"
);
export function toggleAvailability() {
  return surroundBlockSelection(
    startingAvailability,
    endingAvailability,
    availabilityBlockWordPattern
  );
}
