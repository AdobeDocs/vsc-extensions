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
  promptForBoolean,
} from "../editorHelpers";

interface LinkProps {
  text?: string;
  url?: string;
  target?: string;
}
function addLinkTag(linkProps: LinkProps): void | Thenable<void> {
  let target = '';
  if (linkProps.target) {
    target = `{${linkProps.target}}`;
  };
  surroundSelection("[" + linkProps.text, "](" + linkProps.url + ")" + target);
}
const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
const markdownLinkRegex: RegExp = /^\[.+\]\(.+\)(\{.+\})|(.*)$/;
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
    // Nothing is selected. See if the surrounding text includes something that resembles
    // a Markdown link markup.
    const surroundingWord = getSurroundingWord(
      editor,
      selection,
      markdownLinkWordPattern
    );

    // If we found a hyperlink, select it.
    if (surroundingWord) {
      selection = editor.selection = surroundingWord;
    }
  }

  // Is something selected from the previous block?
  if (isAnythingSelected()) {
    // Something is selected.
    if (isMatch(markdownLinkRegex)) {
      //Selection is a Markdown link expression, replace it with the link text
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

  let linkObj: LinkProps = { text: "", url: "", target: "" };
  promptForInput("Enter Link URL")
    .then((url) => {
      linkObj.url = url;
      linkObj.text = url;
      return promptForInput("Enter link text");
    })
    .then((text) => {
      linkObj.text = text;
      return promptForBoolean("Open in New Tab?", "Yes or No", "No");
    })
    .then((isBlank) => {
      linkObj.target = isBlank ? "target=_blank" : "";
      return addLinkTag(linkObj);
    });
}
