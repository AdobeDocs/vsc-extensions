// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  ExtensionContext,
  workspace,
  commands,
  window,
  WorkspaceFolder,
  TextEditor,
} from 'vscode';
import {
  checkMarkdownlintCustomProperty,
  checkMarkdownlintCustomConfig,
} from './lib/config-controller';
import { generateTimestamp, output } from './lib/common';
import { register } from './lib/commands';
import MarkdownIt = require('markdown-it');

import * as fs from 'fs';
import * as path from 'path';

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
      .getConfiguration('markdownShortcuts')
      .get('languages') || ['markdown'];
    return new RegExp('(' + languageArray.join('|') + ')');
  }

  function toggleMarkdownShortcuts(langId: string) {
    commands.executeCommand(
      'setContext',
      'markdownShortcuts:enabled',
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
      if (configChange.affectsConfiguration('markdownShortcuts.languages')) {
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
  output.appendLine(`[${msTimeValue}] - Registered markdown shortcuts`);
  // Markdownlint custom rule check
  checkMarkdownlintCustomProperty();
  // Merge markdown lint configuration into user settings
  checkMarkdownlintCustomConfig();

  /**
   * Function to compute the relative path between src and tgt without regard
   * to the current working directory.  The built-in path.relative() function
   * uses the CWD as a base, which cannot be changed. Weird that we have to
   * do this.
   *
   * @param {string} src
   * @param {string} tgt
   * @return {*}  {string}
   */
  function relativePath(src: string, tgt: string): string {
    const srcelts: string[] = src.split('/');
    const tgtelts: string[] = tgt.split('/');
    let eltno = 0;
    // Find the offset in tgt where folder paths are no longer the same. 
    let srcelt: string | undefined = srcelts.shift();
    let tgtelt: string | undefined = tgtelts.shift();
    while (srcelt !== undefined && tgtelt !== undefined && srcelt === tgtelt) {
      srcelt = srcelts.shift();
      tgtelt = tgtelts.shift();
    }
    let popups = tgtelts.length - srcelts.length;
    const fname = './'.concat('../'.repeat(popups)).concat(tgtelt || '').concat('/').concat(tgtelts.join('/'));
    return fname;
  }

  // TODO: Refactor into separate file.
  function makeRelativeLink(link: String): String {
    const folders = workspace.workspaceFolders;
    const currentFile: string | undefined =
      (activeEditor && activeEditor.document.fileName);
    if (!currentFile) {
      output.appendLine(`[${msTimeValue}] - No current editor to compute relative links.`);
      return link;
    }
    output.appendLine(`[${msTimeValue}] - Current editor file path is: ${currentFile}`);
    let linkpath: string = link.toString();
    let relpath: string = linkpath;
    if (fs.existsSync(linkpath.toString())) {
      relpath = relativePath(currentFile, linkpath);
      output.appendLine(`[${msTimeValue}] - Resolved absolute link path ${linkpath} .`);
    } else {
      output.appendLine(`[${msTimeValue}] - Attempting to resolve relative path: ${relpath}`);
      if (folders) {
        folders.forEach((folder: WorkspaceFolder) => {
          linkpath = folder.uri.path + link;
          if (fs.existsSync(linkpath)) {
            relpath = relativePath(currentFile, linkpath);
            output.appendLine(`[${msTimeValue}] - Absolute path found, and exists. ${linkpath}`);
          } else {
            output.appendLine(`[${msTimeValue}] - Link Path ${linkpath} does not exist.`);
          }
        });
      }
    }
    output.appendLine(`[${msTimeValue}] - Relative path resolved to: ${relpath}.`);
    return relpath;
  }
  return {
    extendMarkdownIt(md: MarkdownIt) {
      output.appendLine(
        `[${msTimeValue}] - Markdown-it plugin options are ${JSON.stringify(
          md.options
        )}`
      );
      return md
        .use(require('markdown-it-replace-link'), {
          replaceLink: function (link: String, env: any) {
            return makeRelativeLink(link);
          },
        })
        .use(require('markdown-it-adobe-plugin'));
    },
  };
}
