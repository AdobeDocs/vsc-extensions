import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { TextEditor } from "vscode";
const vscodeTestContent = require("vscode-test-content");

export const testCommand = (
  command: string,
  inputContent: string,
  expectedContent: string
): Thenable<TextEditor> => {
  return vscodeTestContent
    .setWithSelection(inputContent, {
      caret: "•",
      anchor: { start: "«", end: "»" },
      active: { start: "≤", end: "≥" },
    })
    .then((editor: TextEditor) => {
      return Promise.resolve(
        vscode.commands.executeCommand("md-shortcut." + command).then(() =>
          assert.strictEqual(
            vscodeTestContent.getWithSelection(editor, {
              caret: "•",
              anchor: { start: "«", end: "»" },
              active: { start: "≤", end: "≥" },
            }),
            expectedContent
          )
        )
      ).finally(() =>
        void vscode.commands.executeCommand("workbench.action.closeActiveEditor")
      );
    });
};
