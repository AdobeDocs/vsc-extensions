import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { urlRegex, wordMatch } from "../commands";
import {
  surroundSelection,
  isAnythingSelected,
  getSurroundingWord,
  isMatch,
  replaceSelection,
} from "../editorHelpers";

interface LinkUrl {
  text: string;
  url: string | undefined;
}

function getLinkText(selection: Selection): Thenable<string | undefined> {
  if (selection.isEmpty) {
    return vscode.window.showInputBox({
      prompt: "Image alt text",
    });
  }

  return Promise.resolve("");
}

function getLinkUrl(
  linkText: string | undefined
): LinkUrl | Thenable<LinkUrl> | void {
  if (linkText === null || linkText === undefined) {
    return;
  }

  return vscode.window
    .showInputBox({
      prompt: "Image URL",
    })
    .then((url) => {
      return { text: linkText, url: url };
    });
}

function addTags(options: LinkUrl | void): void | Thenable<void> {
  if (!options || !options.url) {
    return;
  }
  surroundSelection("![" + options.text, "](" + options.url + ")");
}

const markdownLinkRegex: RegExp = /^\[.+\]\(.+\)$/;
const markdownLinkWordPattern: RegExp = new RegExp(
  "[.+](.+)|" + wordMatch + "+"
);
export function toggleLink():
  | Thenable<LinkUrl>
  | void
  | Thenable<void>
  | Thenable<boolean> {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let selection: Selection = editor.selection;

  if (!isAnythingSelected()) {
    const withSurroundingWord = getSurroundingWord(
      editor,
      selection,
      markdownLinkWordPattern
    );

    if (withSurroundingWord) {
      selection = editor.selection = withSurroundingWord;
    }
  }

  if (isAnythingSelected()) {
    if (isMatch(markdownLinkRegex)) {
      //Selection is a MD link, replace it with the link text
      return replaceSelection((text) => {
        const mdLink: RegExpMatchArray | null = text.match(/\[(.+)\]/);
        return mdLink ? mdLink[1] : text;
      });
    }

    if (isMatch(urlRegex)) {
      //Selection is a URL, surround it with angle brackets
      return surroundSelection("<", ">");
    }
  }

  return getLinkText(selection).then(getLinkUrl).then(addTags);
}
