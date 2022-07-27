import * as vscode from "vscode";
import { surroundSelection } from "../editorHelpers";

interface BoldExpressions {
  [idx: string]: RegExp;
}

const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
const toggleBoldExpressions: BoldExpressions = {
  "**": new RegExp(`\\*{2}${wordMatch}*\\*{2}|${wordMatch}+`),
  __: new RegExp(`_{2}${wordMatch}*_{2}|${wordMatch}+`),
};

export function toggleBold(): Thenable<boolean | void> {
  const marker: string | undefined = vscode.workspace
    .getConfiguration("markdown.bold")
    .get("marker");
  if (!marker) {
    return Promise.reject("No bold marker was found in configuration");
  }

  return surroundSelection(marker, marker, toggleBoldExpressions[marker]);
}
