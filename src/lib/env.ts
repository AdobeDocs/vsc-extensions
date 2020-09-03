import {EOL} from 'os';
import * as vscode from 'vscode';

export function getEol() {
    const newLineSetting = vscode.workspace.getConfiguration('files', null).get('eol');
    let newLine = EOL;
    if (newLineSetting === '\n' || newLineSetting === '\r\n') {newLine = newLineSetting;}

    return newLine;
}