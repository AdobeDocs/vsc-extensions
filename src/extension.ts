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

  // /**
  //  * Function to compute the relative path between src and tgt without regard
  //  * to the current working directory.  The built-in path.relative() function
  //  * uses the CWD as a base, which cannot be changed. Weird that we have to
  //  * do this.
  //  *
  //  * @param {string} src
  //  * @param {string} tgt
  //  * @return {*}  {string}
  //  */
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
    let popups = Math.max(tgtelts.length - srcelts.length - 1, 0);
    const fname = ''
      .concat('../'.repeat(popups))
      .concat(tgtelt || '')
      .concat('/')
      .concat(tgtelts.join('/'));
    return fname;
  }

  /** 
   * Function to find the current root folder of the project.
   */
  function getRootFolder(): WorkspaceFolder | undefined {
    const folders = workspace.workspaceFolders;
    if (folders) {
      return folders[0];
    }
    return undefined;
  }

  /** 
   * Given a link file path, return the path relative to the current workspace folder.
   */
  function makeRelativeLink(link: string): string {
    // If link is a url, return it.
    if (link.startsWith('http') || link.startsWith('https')) {
      return link;
    }
    // Get list of folders in the current workspace.
    const folders = workspace.workspaceFolders;
    // Get the current file.
    const currentFile: string | undefined =
      activeEditor && activeEditor.document.fileName;
    if (!currentFile) {
      output.appendLine(
        `[${msTimeValue}] - No current editor to compute relative links.`
      );
      return link;
    }
    output.appendLine(
      `[${msTimeValue}] - Current editor file path is: ${currentFile}`
    );
    let relpath: string = link;
    if (fs.existsSync(link)) {
      relpath = relativePath(currentFile, link);
      output.appendLine(
        `[${msTimeValue}] - Resolved absolute link path ${link} .`
      );
    } else {
      output.appendLine(
        `[${msTimeValue}] - Attempting to resolve relative path: ${relpath}`
      );
      if (folders) {
        folders.forEach((folder: WorkspaceFolder) => {
          link = path.join(folder.uri.path, link);
          if (fs.existsSync(link)) {
            output.appendLine(
              `[${msTimeValue}] - Absolute path found, and exists. ${link}`
            );
            relpath = relativePath(currentFile, link);
            output.appendLine(
              `[${msTimeValue}] - Resolved relative path: ${relpath}`
            );
            if (fs.existsSync(relpath)) {
              output.appendLine(
                `[${msTimeValue}] - Resolved relative path exists. ${relpath}`
              );
            } else {
              output.appendLine(
                `[${msTimeValue}] - Resolved relative path does not exist. ${relpath}`
              );
            }
          } else {
            output.appendLine(
              `[${msTimeValue}] - Link Path ${link} does not exist.`
            );
          }
        });
      }
    }
    output.appendLine(
      `[${msTimeValue}] - Relative path resolved to: ${relpath}.`
    );
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
          replaceLink: function (link: string, env: any) {
            return makeRelativeLink(link);
          },
        })
        .use(require('markdown-it-adobe-plugin'), 
          {
            root: getRootFolder()?.uri.path, 
            throwError: false
          });
    },
  };
}
