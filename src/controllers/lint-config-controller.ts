/* eslint-disable @typescript-eslint/naming-convention */
'use strict';

import { ConfigurationTarget, workspace } from 'vscode';
import { output, generateTimestamp } from '../lib/common';



const DEFAULT_MARKDOWNLINT_CONFIG = {
    "line-length": false,
    "AM001": false,
    "AM005": false,
    "AM011": false,
    "AM018": false,
    "AM020": true,
    "AM033": false,
    "AM045": {
      "bannedTokens": ["table", "image", "htmlFlow"],
      "childReposPattern": "^[a-z0-9-]+$"
    },
    "AM046": {
      "validateSlideshows": true
    },
    "AM054": false,
    "AM055": false,
    "AM056": false,
    "AM058": false,
    "MD005": false,
    "MD006": {
      "severity": "warning"
    },
    "MD007": false,
    "MD009": false,
    "MD012": false,
    "MD013": false,
    "MD014": false,
    "MD024": false,
    "MD025": false,
    "MD026": false,
    "MD027": false,
    "MD028": false,
    "MD030": false,
    "MD032": false,
    "MD033": false,
    "MD034": false,
    "MD036": false,
    "MD037": false,
    "MD038": false,
    "MD039": false,
    "MD040": false,
    "MD041": false,
    "MD045": false,
    "MD046": false,
    "MD047": false,
    "MD049": false,
    "MD050": false,
    "MD051": false,
    "MD053": false,
    "MD059": false,
    "MD060": false
};

/**
 * Method to check for the markdownlint.config property and add workspace settings if they do not exist.
 * Writes to workspace scope only — never touches the user's global settings.
 */
export function checkMarkdownlintConfigSettings() {
	const {msTimeValue} = generateTimestamp();
	const configProperty = 'markdownlint.config';
	const configPropertyData: any = workspace.getConfiguration().inspect(configProperty);
	const customLintConfig = DEFAULT_MARKDOWNLINT_CONFIG;

	if (!configPropertyData) {
		return;
	}

	// If workspace-level settings already exist, leave them alone.
	if (configPropertyData.workspaceValue) {
		output.appendLine(
			`[${msTimeValue}] - Workspace has existing markdownlint.config settings. No changes made.`
		);
		return;
	}

	// Only write if there is an open workspace folder to write into.
	if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
		output.appendLine(
			`[${msTimeValue}] - No workspace folder open. Skipping markdownlint.config setup.`
		);
		return;
	}

	void workspace
		.getConfiguration()
		.update(configProperty, customLintConfig, ConfigurationTarget.Workspace);
	output.appendLine(
		`[${msTimeValue}] - Adobe default markdownlint config settings added to workspace settings.`
	);
}


/**
 * Method to check for the docs custom markdownlint value.
 * Checks for markdownlint.customRules property. Writes to workspace scope only —
 * never touches the user's global settings.
 */
export function checkMarkdownlintCustomProperty() {
	const { msTimeValue } = generateTimestamp();
	const customProperty = 'markdownlint.customRules';
	const customRuleset = '{adobeexl.adobe-markdown-authoring}/markdownlint-custom-rules/rules.mjs';
	const legacyCustomRuleset = '{adobeexl.adobe-markdown-authoring}/markdownlint-custom-rules/rules.js';
	const customPropertyData: any = workspace.getConfiguration().inspect(customProperty);

	if (!customPropertyData) {
		return;
	}

	// Only write if there is an open workspace folder to write into.
	if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
		output.appendLine(
			`[${msTimeValue}] - No workspace folder open. Skipping markdownlint.customRules setup.`
		);
		return;
	}

	// Collect existing workspace-level custom rules (not global).
	const existingWorkspaceRules: string[] = [];
	if (customPropertyData.workspaceValue) {
		const workspaceValues: string[] = Array.isArray(customPropertyData.workspaceValue)
			? customPropertyData.workspaceValue
			: String(customPropertyData.workspaceValue).split(',');
		workspaceValues.forEach((setting: string) => {
			const trimmed = setting.trim();
			if (trimmed && trimmed !== legacyCustomRuleset) {
				existingWorkspaceRules.push(trimmed);
			}
		});
	}

	if (existingWorkspaceRules.indexOf(customRuleset) > -1) {
		output.appendLine(
			`[${msTimeValue}] - Adobe custom markdownlint ruleset already present in workspace settings.`
		);
		return;
	}

	// Add our ruleset to workspace settings.
	existingWorkspaceRules.push(customRuleset);
	void workspace
		.getConfiguration()
		.update(customProperty, existingWorkspaceRules, ConfigurationTarget.Workspace);
	output.appendLine(
		`[${msTimeValue}] - Adobe custom markdownlint ruleset added to workspace settings.`
	);
}
