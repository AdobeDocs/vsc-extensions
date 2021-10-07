import * as vscode from "vscode";
import { TextEditor, Selection } from "vscode";
import { urlRegExp } from "../commands";
import {
  isAnythingSelected,
  isMatch,
  promptForInput,
  replaceSelection,
  surroundSelection,
} from "../editorHelpers";

function addImageTags(text: string, url?: string): Thenable<boolean> {
  return surroundSelection("![" + text, "](" + url + ")");
}

interface ImageProps {
  alt: string | undefined;
  src: string | undefined;
}

const markdownImageRegex: RegExp = /!\[.*\]\((.+)\)/;
export function toggleImage() {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  let selection: Selection = editor.selection;
  let imgObj: ImageProps = {
    alt: "No Image",
    src: "https://example.org/image.png",
  };

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
  return promptForInput("Enter image alt text")
    .then((alt) => {
      imgObj.alt = alt;
      return promptForInput("Enter image source URL");
    })
    .then((src) => {
      imgObj.src = src;
      return addImageTags(imgObj.alt || "", imgObj.src);
    });
}
