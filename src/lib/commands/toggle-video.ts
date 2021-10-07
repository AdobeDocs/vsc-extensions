import * as vscode from "vscode";
import { TextEditor, Selection } from "vscode";
import { urlRegExp } from "../commands";
import {
  surroundSelection,
  getLineSelection,
  isAnythingSelected,
  isMatch,
  replaceSelection,
  promptForInput,
} from "../editorHelpers";

function addTagsToVideo(url: string): Thenable<boolean> {
  return surroundSelection(`>[!VIDEO](${url})`, "");
}

const markdownVideoRegex: RegExp = /^>\[\!VIDEO\]\(.+\).*/;

export function toggleVideo(): Thenable<boolean> {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return Promise.reject("No text editor available");
  }

  // VIDEO tags work on the current line, so ignore the selection and select the whole line.
  let selection: Selection = (editor.selection =
    getLineSelection() || editor.selection);

  // If anything is selected, look for an existing VIDEO tag.
  if (isAnythingSelected()) {
    if (isMatch(markdownVideoRegex)) {
      //Selection is a MD link, replace it with the link text
      return replaceSelection((text) => {
        const videoUrl: RegExpMatchArray | null = text.match(/\((.+)\)/); // Match everything in parentheses
        return videoUrl ? videoUrl[1] : text;
      });
    }

    if (isMatch(urlRegExp)) {
      return replaceSelection((text) => {
        const videoUrl: RegExpMatchArray | null = text.match(urlRegExp);
        if (!(videoUrl && videoUrl.input)) {
          return text; // Should never happen because of the isMatch condition
        } else {
          if (
            videoUrl &&
            videoUrl[0].length < videoUrl.input.length &&
            videoUrl.index
          ) {
            return `>[!VIDEO](${videoUrl[0]}) ${videoUrl.input}`;
          } else {
            return `>[!VIDEO](${videoUrl[0]})`;
          }
        }
      });
    }
  }

  const linkToVideo = promptForInput("Video URL");

  return linkToVideo.then((linkObj) => {
    if (linkObj) {
      return addTagsToVideo(linkObj);
    } else {
      return Promise.reject("No URL provided.");
    }
  });
}
