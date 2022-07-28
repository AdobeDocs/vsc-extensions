/* eslint-disable @typescript-eslint/prefer-for-of */

import {

	Selection,
	TextDocument,
	TextDocumentChangeEvent,
	TextEditor,
	window,
	workspace,
	Position
} from 'vscode';

import { ExtensionContext, extensions } from 'vscode';
import { isMarkdownFileCheckWithoutNotification, matchAll } from './common';

interface IExpressionReplacementPair {
	expression: RegExp;
	replacement: string;
}

const expressionToReplacementMap: IExpressionReplacementPair[] = [
	{ expression: /\u201c/gm /* double left quote               “ */, replacement: '"' },
	{ expression: /\u201d/gm /* double right quote              ” */, replacement: '"' },
	{ expression: /\u2018/gm /* single left quote               ‘ */, replacement: "'" },
	{ expression: /\u2019/gm /* single right quote              ’ */, replacement: "'" },
	{ expression: /\u00A9/gm /* copyright character             © */, replacement: '&copy;' },
	{ expression: /\u2122/gm /* trademark character             ™ */, replacement: '&trade;' },
	{ expression: /\u00AE/gm /* registered trademark character  ® */, replacement: '&reg;' },
	{ expression: /\u20AC/gm /* euro character                  € */, replacement: '&euro;' },
	{ expression: /\u2022/gm /* bullet character                • */, replacement: '*' },
	// Superscript
	{ expression: /\u2070/gm /* 0 superscript character         ⁰ */, replacement: '<sup>0</sup>' },
	{ expression: /\u00B9/gm /* 1 superscript character         ⁴ */, replacement: '<sup>1</sup>' },
	{ expression: /\u00B2/gm /* 2 superscript character         ⁴ */, replacement: '<sup>2</sup>' },
	{ expression: /\u00B3/gm /* 3 superscript character         ⁴ */, replacement: '<sup>3</sup>' },
	{ expression: /\u2074/gm /* 4 superscript character         ⁴ */, replacement: '<sup>4</sup>' },
	{ expression: /\u2075/gm /* 5 superscript character         ⁵ */, replacement: '<sup>5</sup>' },
	{ expression: /\u2076/gm /* 6 superscript character         ⁶ */, replacement: '<sup>6</sup>' },
	{ expression: /\u2077/gm /* 7 superscript character         ⁷ */, replacement: '<sup>7</sup>' },
	{ expression: /\u2078/gm /* 8 superscript character         ⁸ */, replacement: '<sup>8</sup>' },
	{ expression: /\u2079/gm /* 9 superscript character         ⁹ */, replacement: '<sup>9</sup>' },
	// Subscript
	{ expression: /\u2080/gm /* 0 subscript character           ₀ */, replacement: '<sub>0</sub>' },
	{ expression: /\u2081/gm /* 1 subscript character           ₁ */, replacement: '<sub>1</sub>' },
	{ expression: /\u2082/gm /* 2 subscript character           ₂ */, replacement: '<sub>2</sub>' },
	{ expression: /\u2083/gm /* 3 subscript character           ₃ */, replacement: '<sub>3</sub>' },
	{ expression: /\u2084/gm /* 4 subscript character           ₄ */, replacement: '<sub>4</sub>' },
	{ expression: /\u2085/gm /* 5 subscript character           ₅ */, replacement: '<sub>5</sub>' },
	{ expression: /\u2086/gm /* 6 subscript character           ₆ */, replacement: '<sub>6</sub>' },
	{ expression: /\u2087/gm /* 7 subscript character           ₇ */, replacement: '<sub>7</sub>' },
	{ expression: /\u2088/gm /* 8 subscript character           ₈ */, replacement: '<sub>8</sub>' },
	{ expression: /\u2089/gm /* 9 subscript character           ₉ */, replacement: '<sub>9</sub>' }
];

const tabExpression: RegExp = /\t/gm;

/**
 * Finds and replaces target expressions. For example, smart quotes (`“, ”, ‘, and ’` such as those found in Word documents) with standard quotes.
 * @param event the event fired when a text document is changed.
 */
export async function findAndReplaceTargetExpressions(event: TextDocumentChangeEvent) {
	if (!workspace.getConfiguration('markdown').replaceSmartQuotes) {
		return;
	}

	if (!!event && event.document) {
		const editor = window.activeTextEditor;
		if (
			editor &&
			isMarkdownFileCheckWithoutNotification(editor) &&
			event.document.fileName === editor.document.fileName
		) {
			const document = event.document;
			const content = document.getText();
			if (!!content) {
				const replacements: Replacements = [];
				if (workspace.getConfiguration('editor').insertSpaces) {
					const tabSize = (workspace.getConfiguration('editor').tabSize as number) || 4;
					if (!expressionToReplacementMap.some(pair => pair.expression === tabExpression)) {
						expressionToReplacementMap.push({
							expression: tabExpression,
							replacement: ''.padEnd(tabSize, ' ')
						});
					}
				}

				expressionToReplacementMap.forEach(
					(expressionToReplacement: IExpressionReplacementPair) => {
						const targetReplacements = findReplacements(
							document,
							content,
							expressionToReplacement.replacement,
							expressionToReplacement.expression
						);
						if (targetReplacements && targetReplacements.length) {
							for (let index = 0; index < targetReplacements.length; index++) {
								const replacement = targetReplacements[index];
								replacements.push(replacement);
							}
						}
					}
				);

				if (replacements.length > 0) {
					await applyReplacements(replacements, editor);
				}
			}
		}
	}

	return event;
}

export interface RegExpWithGroup {
	expression: RegExp;
	groups: string[];
}

export type RegExpOrRegExpWithGroup = RegExp | RegExpWithGroup;

function isRegExp(expression?: RegExpOrRegExpWithGroup): expression is RegExp {
	return (expression as RegExp).source !== undefined;
}

export interface Replacement {
	selection: Selection;
	value: string;
}

export type Replacements = Replacement[];

export function findReplacements(
	document: TextDocument,
	content: string,
	value: string,
	expression?: RegExpOrRegExpWithGroup
): Replacements | undefined {
	if (!expression) {
		return undefined;
	}

	const exp = isRegExp(expression) ? expression : expression.expression;
	const results = matchAll(exp, content);
	if (!results || !results.length) {
		return undefined;
	}

	const groups = !isRegExp(expression) ? expression.groups : null;
	const replacements: Replacements = [];
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result !== null && result.length) {
			const match = groups && result.groups ? result.groups[groups[0]] : result[0];
			if (match) {
				let index = result.index !== undefined ? result.index : -1;
				if (index === -1) {
					continue;
				}
				if (groups) {
					index += result[0].indexOf(match);
				}

				const startPosition = document.positionAt(index);
				const endPosition = document.positionAt(index + match.length);
				const selection = new Selection(startPosition, endPosition);

				replacements.push({
					selection,
					value: value ? value : document.getText(selection)
				});
			}
		}
	}

	return replacements;
}

export function findReplacement(
	document: TextDocument,
	content: string,
	value: string,
	expression?: RegExpOrRegExpWithGroup
): Replacement | undefined {
	const exp = isRegExp(expression) ? expression : expression?.expression;
	const result = exp ? exp.exec(content) : null;
	if (result !== null && result.length) {
		const groups = !isRegExp(expression) ? expression?.groups : null;
		const match = groups && result.groups ? result.groups[groups[0]] : result[0];
		if (match && match !== value) {
			let index = result.index;
			if (groups) {
				index += result[0].indexOf(match);
			}
			const startPosition = document.positionAt(index);
			const endPosition = new Position(startPosition.line, startPosition.character + match.length);
			const selection = new Selection(startPosition, endPosition);

			return {
				selection,
				value: value ? value : document.getText(selection)
			};
		}
	}

	return undefined;
}

export async function applyReplacements(replacements: Replacements, editor: TextEditor) {
	if (replacements && replacements.length) {
		await editor.edit(builder => {
			replacements.forEach(replacement =>
				builder.replace(replacement.selection, replacement.value)
			);
		});
	}
}

export interface RangeValuePair {
	index: number;
	length: number;
	value: string;
}

export function findMatchesInText(
	content: string,
	expression?: RegExpOrRegExpWithGroup
): RangeValuePair[] | undefined {
	if (!expression) {
		return undefined;
	}

	const exp = isRegExp(expression) ? expression : expression.expression;
	const results = matchAll(exp, content);
	if (!results || !results.length) {
		return undefined;
	}

	const groups = !isRegExp(expression) ? expression.groups : null;
	const values: RangeValuePair[] = [];
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result !== null && result.length) {
			const match = groups && result.groups ? result.groups[groups[0]] : result[0];
			if (match) {
				let index = result.index !== undefined ? result.index : -1;
				if (index === -1) {
					continue;
				}
				if (groups) {
					index += result[0].indexOf(match);
				}

				values.push({
					index,
					length: match.length,
					value: match
				});
			}
		}
	}

	return values;
}


export function removeFirstOccurrence(str: string, searchstr: string) {
	const index = str.indexOf(searchstr);
	if (index === -1) {
		return str;
	}
	return str.slice(0, index) + str.slice(index + searchstr.length);
}
