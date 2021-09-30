import * as vscode from "vscode";
import { TextEditor, Selection } from "vscode";
import { urlRegExp } from "../commands";
import {
  isAnythingSelected,
  isMatch,
  replaceSelection,
} from "../editorHelpers";

const markdownImageRegex: RegExp = /!\[.*\]\((.+)\)/;
export function toggleImage() {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let selection: Selection = editor.selection;

  if (isAnythingSelected()) {
    if (isMatch(markdownImageRegex)) {
      //Selection is a MD link, replace it with the link text
      return replaceSelection((text) => {
        const textMatch: RegExpMatchArray | null =
          text.match(markdownImageRegex);
        return textMatch ? textMatch[1] : "";
      });
    }

    if (isMatch(urlRegExp)) {
      return vscode.window
        .showInputBox({
          prompt: "Image alt text",
        })
        .then((text) => {
          if (text === null) {
            return;
          }
          replaceSelection((url) => "![" + text + "](" + url + ")");
        });
    }
  }
  return getLinkText(selection).then(getLinkUrl).then(addTags);
}
