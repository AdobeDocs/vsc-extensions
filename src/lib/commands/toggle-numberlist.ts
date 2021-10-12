import {
  isAnythingSelected,
  isBlockMatch,
  replaceBlockSelection,
  surroundSelection,
} from "../editorHelpers";

interface LineNums {
  [index: string]: number;
}

const hasNumbers: RegExp = /^(\s*)[0-9]\.+ (.*)$/gm;
const addNumbers: RegExp = /^(\n?)(\s*)(.+)$/gm;

export function toggleNumberList() {
  if (!isAnythingSelected()) {
    return surroundSelection("1. ", "");
  }

  if (isBlockMatch(hasNumbers)) {
    return replaceBlockSelection((text) => text.replace(addNumbers, "$1$2"));
  } else {
    const lineNums: LineNums = {};
    return replaceBlockSelection((text) =>
      text.replace(addNumbers, (match, newline, whitespace, line) => {
        if (!lineNums[whitespace]) {
          lineNums[whitespace] = 1;
        }
        return newline + whitespace + lineNums[whitespace]++ + ". " + line;
      })
    );
  }
}
