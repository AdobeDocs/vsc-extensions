import { surroundSelection } from "../editorHelpers";

const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
const toggleStrikethroughPattern: RegExp = new RegExp(
  "~{2}" + wordMatch + "*~{2}|" + wordMatch + "+"
);

export function toggleStrikethrough() {
  return surroundSelection("~~", "~~", toggleStrikethroughPattern);
}
