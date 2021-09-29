import { wordMatch } from "../commands";
import { surroundSelection } from "../editorHelpers";

const toggleUIControlPattern: RegExp = new RegExp(
  "[!UICONTROL " + wordMatch + "]" + wordMatch + "+"
);

export function toggleUIControl() {
  return surroundSelection("[!UICONTROL ", "]", toggleUIControlPattern);
}
