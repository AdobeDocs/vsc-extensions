import { surroundSelection } from "../editorHelpers";

const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
const toggleUIControlPattern: RegExp = new RegExp(
  "[!UICONTROL " + wordMatch + "]" + wordMatch + "+"
);

export function toggleUIControl() {
  return surroundSelection("[!UICONTROL ", "]", toggleUIControlPattern);
}
