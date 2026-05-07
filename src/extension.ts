// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  ExtensionContext,
  workspace,
  commands,
  window,
} from 'vscode';
import { GhecPanelProvider } from './panels/ghec-panel';
import { AdobePreviewManager } from './panels/adobe-preview-panel';

import {
	checkMarkdownlintCustomProperty,checkMarkdownlintConfigSettings
} from './controllers/lint-config-controller';
import { generateTimestamp, output } from './lib/common';
import { register } from './lib/commands';
import { findAndReplaceTargetExpressions } from './lib/utiity';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  const extensionPath: string = context.extensionPath;
  const { msTimeValue } = generateTimestamp();
  output.appendLine(
    `[${msTimeValue}] - Activating Adobe Flavored Markdown extension at ${extensionPath}`
  );

  output.appendLine(`[${msTimeValue}] - Activating docs linting extension.`);
  // Markdown Lint custom rule check
  checkMarkdownlintCustomProperty();
  // Markdown Lint config check
  checkMarkdownlintConfigSettings();

  // Markdown Shortcuts
  function buildLanguageRegex(): RegExp {
    const languageArray: string[] | undefined = workspace
      .getConfiguration('markdown')
      .get('languages') || ['markdown'];
    return new RegExp('(' + languageArray.join('|') + ')');
  }

  function togglemarkdown(langId: string) {
    void commands.executeCommand(
      'setContext',
      'markdown:enabled',
      languageRegex.test(langId)
    );
  }

  // Execute on activate
  let languageRegex = buildLanguageRegex();
  let activeEditor = window.activeTextEditor;
  if (activeEditor) {
    togglemarkdown(activeEditor.document.languageId);
  }

  // Update languageRegex if the configuration changes
  workspace.onDidChangeConfiguration(
    (configChange) => {
      if (configChange.affectsConfiguration('markdown.languages')) {
        languageRegex = buildLanguageRegex();
      }
    },
    null,
    context.subscriptions
  );

  // Enable/disable markdown
  window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (activeEditor) {
        togglemarkdown(activeEditor.document.languageId);
      }
    },
    null,
    context.subscriptions
  );

  // When the document changes, find and replace target expressions (for example, smart quotes).
  workspace.onDidChangeTextDocument(
    findAndReplaceTargetExpressions,
    null,
    context.subscriptions
  );

  // Triggered with language id change
  workspace.onDidOpenTextDocument(
    (document) => {
      if (activeEditor && activeEditor.document === document) {
        togglemarkdown(activeEditor.document.languageId);
      }
    },
    null,
    context.subscriptions
  );

  register(context);
  output.appendLine(`[${msTimeValue}] - Registered markdown shortcuts`);

  const adobePreview = new AdobePreviewManager(context);
  context.subscriptions.push(adobePreview);
  context.subscriptions.push(
    commands.registerCommand('adobeExl.openAdobePreview', () => adobePreview.show())
  );
  context.subscriptions.push(
    commands.registerCommand(
      'adobeExl.openAdobePreviewDeveloperTools',
      async () => {
        try {
          await commands.executeCommand(
            'workbench.action.webview.openDeveloperTools'
          );
        } catch {
          void window.showWarningMessage(
            'Could not open webview DevTools from the extension. Focus the Adobe Preview panel, then run **Developer: Open Webview Developer Tools** from the Command Palette.'
          );
        }
      }
    )
  );

  const ghecProvider = new GhecPanelProvider(context);
  context.subscriptions.push(
    window.registerWebviewViewProvider('adobeExl.ghecPanel', ghecProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
}
