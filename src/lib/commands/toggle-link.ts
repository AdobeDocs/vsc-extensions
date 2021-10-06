import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { urlRegExp } from "../commands";
import {
  surroundSelection,
  isAnythingSelected,
  getSurroundingWord,
  isMatch,
  replaceSelection,
  promptForInput,
} from "../editorHelpers";

interface LinkProps {
  text: string | undefined;
  url: string | undefined;
}
function addLinkTag(linkProps: LinkProps): void | Thenable<void> {
  surroundSelection("[" + linkProps.text, "](" + linkProps.url + ")");
}
const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
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
      surroundSelection("[](", ")");
      return;
    }
  }

  let linkObj: LinkProps = { text: "", url: "" };

  promptForInput("Enter link display text")
    .then((text) => {
      linkObj.text = text;
      return promptForInput("Enter link target URL");
    })
    .then((url) => {
      linkObj.url = url;
      return addLinkTag(linkObj);
    });
}
