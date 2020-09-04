// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, workspace, commands, window } from "vscode";
import { checkMarkdownlintCustomProperty } from "./utils/config-controller";
import { generateTimestamp, output } from "./utils/common";
import { register } from "./lib/commands";
import MarkdownIt = require("markdown-it");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  var extensionPath: string = context.extensionPath;
  const { msTimeValue } = generateTimestamp();
  output.appendLine(
    `[${msTimeValue}] - Activating Adobe Flavored Markdown extension at ${extensionPath}`
  );
  // Markdown Shortcuts
  function buildLanguageRegex(): RegExp {
    const languageArray: string[] | undefined = workspace
      .getConfiguration("markdownShortcuts")
      .get("languages") || ["markdown"];
    return new RegExp("(" + languageArray.join("|") + ")");
  }

  function toggleMarkdownShortcuts(langId: string) {
    commands.executeCommand(
      "setContext",
      "markdownShortcuts:enabled",
      languageRegex.test(langId)
    );
  }

  // Execute on activate
  let languageRegex = buildLanguageRegex();
  let activeEditor = window.activeTextEditor;
  if (activeEditor) {
    toggleMarkdownShortcuts(activeEditor.document.languageId);
  }

  // Update languageRegex if the configuration changes
  workspace.onDidChangeConfiguration(
    (configChange) => {
      if (configChange.affectsConfiguration("markdownShortcuts.languages")) {
        languageRegex = buildLanguageRegex();
      }
    },
    null,
    context.subscriptions
  );

  // Enable/disable markdownShortcuts
  window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (activeEditor) {
        toggleMarkdownShortcuts(activeEditor.document.languageId);
      }
    },
    null,
    context.subscriptions
  );

  // Triggered with language id change
  workspace.onDidOpenTextDocument(
    (document) => {
      if (activeEditor && activeEditor.document === document) {
        toggleMarkdownShortcuts(activeEditor.document.languageId);
      }
    },
    null,
    context.subscriptions
  );

  register(context);
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
