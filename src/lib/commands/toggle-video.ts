import * as vscode from "vscode";
import { TextEditor, Selection } from "vscode";
import {
  surroundSelection,
  getLineSelection,
  isAnythingSelected,
  isMatch,
  replaceSelection,
} from "../editorHelpers";

function addTagsToVideo(url: string): Thenable<boolean> {
  return surroundSelection(`>[!VIDEO](${url})`, "");
}

function getLinkUrlToVideo(): Thenable<string> {
  return vscode.window
    .showInputBox({
      prompt: "Video URL",
    })
    .then((url) => {
      return url || "";
    });
}

const markdownVideoRegex: RegExp = /^>\[\!VIDEO\]\(.+\).*/;
const videoUrlRegex: RegExp =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

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

    if (isMatch(videoUrlRegex)) {
      return replaceSelection((text) => {
        const videoUrl: RegExpMatchArray | null = text.match(videoUrlRegex);
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

  const linkToVideo = getLinkUrlToVideo();

  return linkToVideo.then((linkObj) => {
    if (linkObj) {
      return addTagsToVideo(linkObj);
    } else {
      return Promise.reject("No URL provided.");
    }
  });
}
