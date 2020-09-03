// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext } from "vscode";
import { checkMarkdownlintCustomProperty } from "./utils/config-controller";
import { generateTimestamp, output } from "./utils/common";
import MarkdownIt = require("markdown-it");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  var extensionPath: string = context.extensionPath;
  const { msTimeValue } = generateTimestamp();
  output.appendLine(
    `[${msTimeValue}] - Activating Adobe Flavored Markdown extension at ${extensionPath}`
  );
  // Markdownlint custom rule check
  checkMarkdownlintCustomProperty();
  return {
    extendMarkdownIt(md: MarkdownIt) {
      output.appendLine(
        `[${msTimeValue}] Markdown plugin options are ${JSON.stringify(
          md.options
        )}`
      );
      return md.use(require("markdown-it-adobe-plugin"));
    },
  };
}
