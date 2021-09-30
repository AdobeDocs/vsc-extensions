import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { urlRegExp, wordMatch } from "../commands";
import {
  surroundSelection,
  isAnythingSelected,
  getSurroundingWord,
  isMatch,
  replaceSelection,
} from "../editorHelpers";

// function getLinkText(selection: Selection): Thenable<string | undefined> {
//   if (selection.isEmpty) {
//     return vscode.window.showInputBox({
//       prompt: "Image alt text",
//     });
//   }
//   return Promise.resolve()
// }

// function getLinkUrl(
//   linkText: string | undefined
// ): Thenable<string> {
//   if (linkText === null || linkText === undefined) {
//     Promise.reject('No Link Text provided');
//   }

//   return vscode.window
//     .showInputBox({
//       prompt: "Link URL",
//     })
//     .then((url) => {
//       return { text: linkText, url: url };
//     });
// }

function addTags(text: string, url?: string): void | Thenable<void> {
  surroundSelection("![" + text, "](" + url + ")");
}

const markdownLinkRegex: RegExp = /^\[.+\]\(.+\)$/;
const markdownLinkWordPattern: RegExp = new RegExp(
  "[.+](.+)|" + wordMatch + "+"
);
export function toggleLink(): void {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let selection: Selection = editor.selection;

  if (!isAnythingSelected()) {
    const surroundingWord = getSurroundingWord(
      editor,
      selection,
      markdownLinkWordPattern
    );

    if (surroundingWord) {
      selection = editor.selection = surroundingWord;
    }
  }

  if (isAnythingSelected()) {
    if (isMatch(markdownLinkRegex)) {
      //Selection is a MD link, replace it with the link text
      replaceSelection((text) => {
        const mdLink: RegExpMatchArray | null = text.match(/\[(.+)\]/);
        return mdLink ? mdLink[1] : text;
      });
      return;
    }

    if (isMatch(urlRegExp)) {
      //Selection is a URL, surround it with angle brackets
      surroundSelection("<", ">");
      return;
    }
  }

  // promptForInput("Enter link display text", editor.document.getText(selection))
  //   .then((display) => promptForInput("Enter URL", display)).then(addTags);
  return;
}
