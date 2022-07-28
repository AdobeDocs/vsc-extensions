import * as vscode from 'vscode';
import { isAnythingSelected, isBlockMatch, replaceBlockSelection, surroundSelection } from '../editorHelpers';

const addBullets: RegExp = /^(\s*)(.+)$/gm;
export function toggleBullets() {
    const marker = vscode.workspace
        .getConfiguration("markdown.bullets")
        .get("marker");

    if (!isAnythingSelected()) {
        return surroundSelection(
            marker + " ",
            "",
            new RegExp("\\" + marker + " .+|.+")
        );
    }

    const hasBullets = new RegExp("^(\\s*)\\" + marker + " (.*)$", "gm");

    if (isBlockMatch(hasBullets)) {
        return replaceBlockSelection((text) => text.replace(hasBullets, "$1$2"));
    } else {
        return replaceBlockSelection((text) =>
            text.replace(addBullets, "$1" + marker + " $2")
        );
    }
}