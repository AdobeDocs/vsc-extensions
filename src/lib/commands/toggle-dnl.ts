import { wordMatch } from "../commands";
import { surroundSelection } from "../editorHelpers";

const toggleDNLPattern: RegExp = new RegExp(
    "[!DNL" + wordMatch + "]" + wordMatch + "+"
);

export function toggleDNL() {
    return surroundSelection("[!DNL ", "]", toggleDNLPattern);
}