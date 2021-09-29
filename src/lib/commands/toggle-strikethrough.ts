import { wordMatch } from "../commands";
import { surroundSelection } from "../editorHelpers";

const toggleStrikethroughPattern: RegExp = new RegExp(
  "~{2}" + wordMatch + "*~{2}|" + wordMatch + "+"
);

export function toggleStrikethrough() {
  return surroundSelection("~~", "~~", toggleStrikethroughPattern);
}
