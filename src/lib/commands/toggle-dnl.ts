import { surroundSelection } from "../editorHelpers";

const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
const toggleDNLPattern: RegExp = new RegExp(
  "[!DNL" + wordMatch + "]" + wordMatch + "+"
);

export function toggleDNL() {
  return surroundSelection("[!DNL ", "]", toggleDNLPattern);
}
