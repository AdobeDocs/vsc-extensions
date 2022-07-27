import * as vscode from "vscode";

import { surroundSelection } from "../editorHelpers";

interface ItalicExpressions {
  [idx: string]: RegExp;
}

const wordMatch: string = "[A-Za-z\\u00C0-\\u017F]";
const toggleItalicExpressions: ItalicExpressions = {
  _: new RegExp(`\\_{1}${wordMatch}*\\_{1}|${wordMatch}+`),
  __: new RegExp(`\\{2}${wordMatch}*\\{2}|${wordMatch}+`),
};

export function toggleItalic(): void | Thenable<void> | Thenable<boolean> {
  const marker: string | undefined = vscode.workspace
    .getConfiguration("markdown.italics")
    .get("marker");
  if (!marker) {
    return;
  }
  const pattern: RegExp = new RegExp(`\\${marker}?${wordMatch}*\\${marker}?`);

  return surroundSelection(marker, marker, toggleItalicExpressions[marker]);
}
