import * as vscode from 'vscode';
import { Selection, TextEditor, Range, Position, TextEditorEdit } from 'vscode';

export function replaceSelection(
  replaceFunc: (text: string) => string
): Thenable<boolean> {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return Promise.resolve(false);
  }
  const selection: Selection = editor.selection;

  var newText: string = replaceFunc(editor.document.getText(selection));
  return editor.edit((edit) => edit.replace(selection, newText));
}

export function replaceBlockSelection(
  replaceFunc: (text: string) => string
): Thenable<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return Promise.resolve(false);
  }
  const selection = getBlockSelection();
  if (!selection) {
    return Promise.reject('No Selection to replace.');
  }

  const newText = replaceFunc(editor.document.getText(selection));
  return editor
    .edit((edit) => edit.replace(selection, newText))
    .then((success) => {
      const newSelection = getBlockSelection();
      if (newSelection) {
        editor.selection = newSelection;
      }
      return success;
    });
}

export function isAnythingSelected(): boolean {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  return !!editor && !editor.selection.isEmpty;
}

export function surroundSelection(
  startPattern: string,
  endPattern: string,
  wordPattern?: RegExp
): Thenable<boolean> {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return Promise.reject('No Text Editor Defined');
  }
  let selection: Selection | void = editor.selection;
  if (selection === undefined) {
    return Promise.reject('Selection is undefined.');
  }

  if (!isAnythingSelected()) {
    const withSurroundingWord: Selection | void = getSurroundingWord(
      editor,
      selection,
      wordPattern
    );

    if (withSurroundingWord) {
      selection = editor.selection = withSurroundingWord;
    }
  }

  // Note, even though we're expanding selection, there's still a potential chance
  // for collapsed, e.g. empty file, or just an empty line.
  if (!isAnythingSelected()) {
    const position: Position = selection.active;
    var newPosition = position.with(
      position.line,
      position.character + startPattern.length
    );
    return editor
      .edit((editBuilder: TextEditorEdit) => {
        editBuilder.insert(position, startPattern + endPattern);
      })
      .then(() => {
        editor.selection = new Selection(newPosition, newPosition);
        return !!editor.selection;
      });
  } else if (isSelectionMatch(selection, startPattern, endPattern)) {
    return replaceSelection((text: string): string =>
      text.substr(
        startPattern.length,
        text.length - startPattern.length - endPattern.length
      )
    );
  } else {
    return replaceSelection((text) => startPattern + text + endPattern);
  }
}

export function getSurroundingPattern(
  editor: TextEditor,
  selection: Selection,
  pattern?: RegExp
): Selection | void {

  const line: vscode.TextLine = editor.document.lineAt(selection.active);
  const matched: RegExpExecArray | null | undefined = pattern?.exec(line.text);

  if (matched) {
    const selStart = new Position(line.lineNumber, matched.index);
    const selEnd = new Position(line.lineNumber, matched.index + matched[0].length);
    return new Selection(selStart, selEnd);
  } else {
    return;
  }
}

export function getSurroundingWord(
  editor: TextEditor,
  selection: Selection,
  wordPattern?: RegExp
): Selection | void {
  var range: Range | undefined = editor.document.getWordRangeAtPosition(
    selection.active,
    wordPattern
  );
  if (range === undefined) {
    return;
  } else {
    return new Selection(range.start, range.end);
  }
}

export function surroundBlockSelection(
  startPattern: string,
  endPattern?: string,
  wordPattern?: RegExp
): Thenable<void | boolean> {
  if (endPattern === undefined || endPattern === null) {
    endPattern = startPattern;
  }

  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return Promise.reject('No Text Editor is Defined');
  }
  let selection: void | Selection = getBlockSelection();
  if (!selection) {
    return Promise.reject('No selection is available');
  }

  if (!isAnythingSelected()) {
    var withSurroundingWord: Selection | void = getSurroundingWord(
      editor,
      selection,
      wordPattern
    );

    if (withSurroundingWord) {
      selection = editor.selection = withSurroundingWord;
    }
  }

  if (!isAnythingSelected()) {
    var position = selection.active;
    var newPosition = position.with(position.line + 2, 1);
    return editor
      .edit((editBuilder: TextEditorEdit) =>
        editBuilder.insert(position, `${startPattern}${endPattern}`)
      )
      .then(() => {
        editor.selection = new vscode.Selection(newPosition, newPosition);
      });
  } else {
    if (isSelectionMatch(selection, startPattern, endPattern)) {
      return replaceBlockSelection((text) => {
        const start: number = startPattern.toString().length;
        const end: number = endPattern ? endPattern.toString().length : start;
        const len: number = text.length - start - end;
        return text.substr(start, len);
      });
    } else {
      return replaceBlockSelection((text) => startPattern + text + endPattern);
    }
  }
}

export function getBlockSelection(): Selection | void {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const selection: Selection = editor.selection;

  if (selection.isEmpty) {
    return selection;
  }

  return new Selection(
    selection.start.with(undefined, 0),
    selection.end.with(selection.end.line + 1, 0)
  );
}

export function getLineSelection(): Selection | void {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const selection: Selection = editor.selection;

  const endchar = editor.document.lineAt(selection.start.line).range.end
    .character;
  return new Selection(
    selection.start.with(selection.start.line, 0),
    selection.end.with(selection.start.line, endchar)
  );
}

export function isBlockMatch(
  startPattern: RegExp,
  endPattern?: RegExp
): boolean {
  const selection: void | Selection = getBlockSelection();
  if (!selection) {
    return false;
  }
  return isSelectionMatch(selection, startPattern, endPattern);
}

export function isMatch(startPattern: RegExp, endPattern?: RegExp): boolean {
  const editor: TextEditor | void = vscode.window.activeTextEditor;
  if (!editor) {
    return false;
  }
  return isSelectionMatch(editor.selection, startPattern, endPattern);
}

export function isSelectionMatch(
  selection: Selection,
  startPattern: RegExp | string,
  endPattern?: RegExp | string
): boolean {
  const editor: TextEditor | void = vscode.window.activeTextEditor;
  if (!editor) {
    return false;
  }
  var text = editor.document.getText(selection);
  if (startPattern.constructor === RegExp) {
    return startPattern.test(text);
  } else {
    return (
      text.startsWith(startPattern.toString()) &&
      (!endPattern || text.endsWith(endPattern.toString()))
    );
  }
}

/**
 *
 * @param selection
 * @param pattern
 * @returns
 */
export function reSelect(selection: Selection, pattern: RegExp): Selection {
  const editor: TextEditor | void = vscode.window.activeTextEditor;
  if (!editor) {
    return selection;
  }
  const text = editor.document.getText(selection);
  const matched = pattern.exec(text);
  if (matched) {
    return new Selection(
      selection.start.with(selection.start.line, matched.index),
      selection.end.with(
        selection.start.line,
        matched.index + matched[0].length
      )
    );
  } else {
    return selection;
  }
}

export function prefixLines(text: string): Thenable<boolean> | void {
  const editor: TextEditor | undefined = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const selection: Selection = editor.selection;
  return editor.edit((builder) => {
    for (let line = selection.start.line; line <= selection.end.line; line++) {
      builder.insert(selection.start.with(line, 0), text);
    }
  });
}

export function promptForInput(
  prompt: string,
  placeHolder?: string,
  value?: string
): Thenable<string | undefined> {
  const opts: vscode.InputBoxOptions = { prompt, value, placeHolder };
  return vscode.window.showInputBox(opts);
};

const TRUESTR = /t|true|y|yes|1/i;
function isTrueish(val?: string): boolean {
  if (!val) { return false; }
  const istrue: RegExpMatchArray | null = val.match(TRUESTR);
  return istrue !== null && istrue.length > 0;
}

export function promptForBoolean(
  prompt: string,
  placeHolder?: string,
  value?: string): Thenable<boolean | undefined> {
  const opts: vscode.InputBoxOptions = { prompt, value, placeHolder };
  return vscode.window.showInputBox(opts).then((retval) => (isTrueish(retval)));
}
