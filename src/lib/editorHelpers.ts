
import * as vscode from 'vscode';
import { Selection, TextEditor, Range, Position } from 'vscode';

export function replaceSelection(replaceFunc:()=>string):Thenable<boolean>|void {
    const editor:TextEditor|undefined = vscode.window.activeTextEditor;
    if (!editor) return;
    const selection:Selection = editor.selection;
    
    var newText: string = replaceFunc(editor.document.getText(selection));
    return editor.edit(edit => edit.replace(selection, newText));
}

export function replaceBlockSelection(replaceFunc):Thenable<boolean>|void {
    var editor = vscode.window.activeTextEditor;
    var selection = getBlockSelection();
    
    var newText = replaceFunc(editor.document.getText(selection));
    return editor.edit(edit => edit.replace(selection, newText));
}

export function isAnythingSelected():boolean {
    const editor: TextEditor|undefined = vscode.window.activeTextEditor;
    return !!editor && !editor.selection.isEmpty;
}

export function surroundSelection(startPattern:string, endPattern:string, wordPattern:string):Thenable<boolean>|void 
{
    if (endPattern === undefined || endPattern === null) {endPattern = startPattern};
    
    const editor: TextEditor| undefined = vscode.window.activeTextEditor;
    if (editor===undefined) {return;}
    let selection:Selection|void = editor.selection;

    if (!isAnythingSelected())
    {
        const withSurroundingWord :Selection|void= getSurroundingWord(editor, selection, wordPattern);

        if (withSurroundingWord !== null) {
            selection = editor.selection = withSurroundingWord;
        }
    }    
    
    // Note, even though we're expanding selection, there's still a potential chance
    // for collapsed, e.g. empty file, or just an empty line.
    if ( !isAnythingSelected()) {
        const position: Position = selection.active;
        var newPosition = position.with(position.line, position.character + startPattern.length)
        return editor.edit((edit) => {
            edit.insert(selection.start, startPattern + endPattern);
        } ).then(() => {
            editor.selection = new vscode.Selection(newPosition, newPosition)
        } )
    } else if (isSelectionMatch(selection, startPattern, endPattern)) {
        return replaceSelection((text) => text.substr(startPattern.length, text.length - startPattern.length - endPattern.length))
    }
    else {
        return replaceSelection((text) => startPattern + text + endPattern)
    }
}

export function getSurroundingWord(editor:TextEditor, selection:Selection, wordPattern?:RegExp):Selection | void {
    var range:Range|undefined = editor.document.getWordRangeAtPosition(selection.active, wordPattern);
if (range === undefined) {return}else {return new Selection(range.start, range.end)};

}

export function surroundBlockSelection(startPattern?: RegExp, endPattern?: RegExp, wordPattern?:RegExp)
{
    if (endPattern == undefined || endPattern == null) endPattern = startPattern;
    
    const editor:TextEditor|undefined = vscode.window.activeTextEditor;
    const selection = getBlockSelection();
    
    if (!isAnythingSelected()) {
        var withSurroundingWord = getSurroundingWord(editor, selection, wordPattern);

        if (withSurroundingWord != null) {
            selection = editor.selection = withSurroundingWord;
        }
    }

    if (!isAnythingSelected()) {
        var position = selection.active;
        var newPosition = position.with(position.line + 1, 0)
        return editor.edit(edit => edit.insert(selection.start, startPattern + endPattern))
            .then(() => {
                editor.selection = new vscode.Selection(newPosition, newPosition)
            })
    }
    else {
        if (isSelectionMatch(selection, startPattern, endPattern)) {
            return replaceBlockSelection((text) => text.substr(startPattern.length, text.length - startPattern.length - endPattern.length))
        }
        else {
            return replaceBlockSelection((text) => startPattern + text + endPattern)
        }
    }
}

export function getBlockSelection(): Range | void {
    const editor: TextEditor|undefined = vscode.window.activeTextEditor;
    if (!editor) return;
    const selection: Selection = editor.selection;

    if ( selection.isEmpty ) {
        return selection;
    }

    return selection
        .with(selection.start.with(undefined, 0),
              selection.end.with(selection.end.line + 1, 0));
}

export function isBlockMatch(startPattern: RegExp, endPattern:RegExp) {    
    return isSelectionMatch(getBlockSelection(), startPattern, endPattern);
}

export function isMatch(startPattern, endPattern) {    
    return isSelectionMatch(vscode.window.activeTextEditor.selection, startPattern, endPattern);
}

function isSelectionMatch(selection, startPattern, endPattern) {    
    var editor = vscode.window.activeTextEditor;
    var text = editor.document.getText(selection)
    if (startPattern.constructor === RegExp) {
        return startPattern.test(text);
    }
    
    return text.startsWith(startPattern) && text.endsWith(endPattern)
}

function prefixLines(text) {
    const editor:TextEditor|undefined = vscode.window.activeTextEditor;

    const selection: Selection = editor.selection;

    return editor.edit(builder => {
            for (let line = selection.start.line; line <= selection.end.line; line++) {
                builder.insert(selection.start.with(line, 0), text);
            }
        }
    );
}