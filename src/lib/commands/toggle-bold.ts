import * as vscode from 'vscode';

import { wordMatch } from '../commands';
import { surroundSelection } from '../editorHelpers';

interface BoldExpressions {
    [idx: string]: RegExp;
}

const toggleBoldExpressions: BoldExpressions = {
    "**": new RegExp(`\\*{2}${wordMatch}*\\*{2}|${wordMatch}+`),
    __: new RegExp(`_{2}${wordMatch}*_{2}|${wordMatch}+`),
};

export function toggleBold(): void | Thenable<void> | Thenable<boolean> {
    const marker: string | undefined = vscode.workspace
        .getConfiguration("markdownShortcuts.bold")
        .get("marker");
    if (!marker) {
        return;
    }

    return surroundSelection(marker, marker, toggleBoldExpressions[marker]);
}