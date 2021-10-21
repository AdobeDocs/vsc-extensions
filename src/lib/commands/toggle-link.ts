import { URL } from "url";
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
  getSurroundingPattern,
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
  replaceSelection(() => (`[${linkProps.text}](${linkProps.url})${target}`));
}

const MARKDOWN_LINK_REGEX: RegExp = /^\[.+\]\(.+\)(\{.+\})?$/;


export function toggleLink(): void {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let selection: Selection = editor.selection;
  const linkObj: LinkProps = { text: "", url: "", target: "" };

  if (!isAnythingSelected()) {
    // Nothing is selected. Check if the surrounding text includes something that resembles
    // a Markdown link markup.
    const surroundingMarkdown = getSurroundingPattern(
      editor,
      selection,
      MARKDOWN_LINK_REGEX
    );

    // If we found surrounding Markdown, select it.
    if (surroundingMarkdown) {
      selection = editor.selection = surroundingMarkdown;
    } else {
      // Check to see if our cursor is on a URL
      const surroundingUrl = getSurroundingPattern(
        editor, selection, urlRegExp
      );
      // If we found a URL, select it.
      if (surroundingUrl) {
        selection = editor.selection = surroundingUrl;
      }
    }
  }

  // Is something selected now?
  if (isAnythingSelected()) {
    // If we are already in a Markdown link, just return.  Nothing to see here.
    if (isMatch(MARKDOWN_LINK_REGEX)) {
      return;
    }
    // If we are in a URL, grab the URL and put it into the linkObj
    if (isMatch(urlRegExp)) {
      linkObj.url = editor.document.getText(selection);
    } else {
      linkObj.text =editor.document.getText(selection);
    }
  }

  promptForInput("Enter Link URL", linkObj.url, linkObj.url)
    .then((url) => {
      if (!url) { return Promise.reject('URL is Required'); }
      linkObj.url = url;
      return promptForInput("Enter link text", linkObj.text, linkObj.text);
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
