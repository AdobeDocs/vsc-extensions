import { isAnythingSelected, isBlockMatch, replaceBlockSelection, surroundSelection } from "../editorHelpers";

const hasCheckboxes: RegExp = /^(\s*)- \[[ x]{1}\] (.*)$/gim;
const addCheckboxes: RegExp = /^(\s*)(.+)$/gm;
export function toggleCheckboxes() {
    if (!isAnythingSelected()) {
        return surroundSelection("- [ ] ", "", /- \[[ x]{1}\] .+|.+/gi);
    }

    if (isBlockMatch(hasCheckboxes)) {
        return replaceBlockSelection((text) => text.replace(hasCheckboxes, "$1$2"));
    } else {
        return replaceBlockSelection((text) =>
            text.replace(addCheckboxes, "$1- [ ] $2")
        );
    }
}