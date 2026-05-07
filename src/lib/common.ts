import * as vscode from "vscode";
import { TextEditor } from "vscode";

export const output = vscode.window.createOutputChannel(
  "Adobe Markdown Authoring"
);

/**
 * Create timestamp
 */
export function generateTimestamp() {
  const date = new Date(Date.now());
  return {
    msTimeValue: date.toLocaleTimeString([], { hour12: false }),
  };
}

/**
 * Output message with timestamp
 * @param message
 */
export function showStatusMessage(message: string) {
  const { msTimeValue } = generateTimestamp();
  output.appendLine(`[${msTimeValue}] - ${message}`);
}

export function isMarkdownFileCheckWithoutNotification(editor: TextEditor) {
	if (editor.document.languageId !== 'markdown') {
		return false;
	} else {
		return true;
	}
}

export function matchAll(pattern: RegExp, text: string): RegExpMatchArray[] {
	const out: RegExpMatchArray[] = [];
	pattern.lastIndex = 0;
	let match: RegExpMatchArray | null = pattern.exec(text);
	while (match) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (match.index === pattern.lastIndex) {
			pattern.lastIndex++;
		}
		out.push(match);
		match = pattern.exec(text);
	}
	return out;
}
