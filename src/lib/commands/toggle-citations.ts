import { isAnythingSelected, isBlockMatch, prefixLines, replaceBlockSelection, surroundSelection } from "../editorHelpers";

const hasCitations = /^(\s*)> (.*)$/gim;

export function toggleCitations() {
    if (!isAnythingSelected()) {
        return surroundSelection("> ", "", /> .+|.+/gi);
    }

    if (isBlockMatch(hasCitations)) {
        return replaceBlockSelection((text) => text.replace(hasCitations, "$1$2"));
    } else {
        return prefixLines("> ");
    }
}