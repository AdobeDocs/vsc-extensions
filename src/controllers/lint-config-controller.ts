/* eslint-disable @typescript-eslint/naming-convention */
'use strict';

import { ConfigurationTarget, workspace } from 'vscode';
import { showStatusMessage, output, generateTimestamp } from '../lib/common';

// store users markdownlint settings on activation
const markdownlintProperty = 'markdownlint.config';

export function removeBlankLineInsideBlockQuote() {
	const markdownlintData: any = workspace.getConfiguration().inspect(markdownlintProperty);
	// preserve existing markdownlint.config settings if they exist
	if (markdownlintData.globalValue) {
		const existingUserSettings = markdownlintData.globalValue;
		Object.assign(existingUserSettings, { MD028: false });
		workspace
			.getConfiguration()
			.update(markdownlintProperty, existingUserSettings, ConfigurationTarget.Global);
		showStatusMessage(`disabled MD028 rule in Markdownlint config setting.`);
	}
	// add md028 property and front_matter_title property directly (no existing settings)
	if (!markdownlintData.globalValue) {
		const blankLineInsideBlockQuoterParameter = { MD028: false };
		workspace
			.getConfiguration()
			.update(
				markdownlintProperty,
				blankLineInsideBlockQuoterParameter,
				ConfigurationTarget.Global
			);
		showStatusMessage(`disabled MD028 rule in Markdownlint config setting.`);
	}
}

export function addFrontMatterTitle() {
	const markdownlintData: any = workspace.getConfiguration().inspect(markdownlintProperty);
	const addFrontMatterTitleSetting = workspace.getConfiguration('markdown').addFrontMatterTitle;
	// preserve existing markdownlint.config settings if they exist
	if (markdownlintData.globalValue && addFrontMatterTitleSetting) {
		const existingUserSettings = markdownlintData.globalValue;
		Object.assign(existingUserSettings, { MD025: { front_matter_title: '' } });
		workspace
			.getConfiguration()
			.update(markdownlintProperty, existingUserSettings, ConfigurationTarget.Global);
		showStatusMessage(`Added front_matter_title property to Markdownlint config setting.`);
	}
	// add md025 property and front_matter_title property directly (no existing settings)
	if (!markdownlintData.globalValue && addFrontMatterTitleSetting) {
		const frontMatterParameter = { MD025: { front_matter_title: '' } };
		workspace
			.getConfiguration()
			.update(markdownlintProperty, frontMatterParameter, ConfigurationTarget.Global);
		showStatusMessage(`Added front_matter_title property to Markdownlint config setting.`);
	}
	// let user know that markdownlint.config file will not be updated
	if (!addFrontMatterTitleSetting) {
		showStatusMessage(
			`The addFrontMatterTitleSetting value is set to false.  MD025 rule will not be updated.`
		);
	}
}


const DEFAULT_MARKDOWNLINT_CONFIG = {
    "line-length": false,
    "AM001": false,
    "AM009": false,
    "AM011": false,
    "MD003": {
      "style": "atx"
    },
    "MD004": {
      "style": "consistent"
    },
    "MD007": {
      "indent": 4
    },
    "MD009": false,
    "MD012": false,
    "MD014": false,
    "MD024": false,
    "MD025": {
      "front_matter_title": ""
    },
    "MD026": false,
    "MD027": false,
    "MD028": false,
    "MD030": {
      "ul_multi": 3,
      "ol_multi": 2
    },
    "MD033": {
      "allowed_elements": [
        "a",
        "b",
        "br",
        "caption",
        "code",
        "col",
        "colgroup",
        "div",
        "em",
        "I",
        "img",
        "li",
        "ol",
        "p",
        "pre",
        "s",
        "span",
        "strong",
        "sub",
        "sup",
        "table",
        "tbody",
        "td",
        "tfoot",
        "th",
        "thead",
        "tr",
        "u",
        "ul"
      ]
    },
    "MD036": false,
    "MD038": false,
    "MD039": false,
    "MD040": false,
    "MD045": false
};

/**
 * Method to check for the markdownlint.config property in package.json and add user settings if they do not exist.
 */
export function checkMarkdownlintConfigSettings() {
	const {msTimeValue} = generateTimestamp();
	const configProperty = 'markdownlint.config';
	const configPropertyData: any = workspace.getConfiguration().inspect(configProperty);
	const customLintConfig = DEFAULT_MARKDOWNLINT_CONFIG;
	// If the markdownlint.config property exists in package.json, check for existing user settings
	if (configPropertyData) {
		if (configPropertyData.globalValue) {
			const existingUserSettings = configPropertyData.globalValue;
			Object.assign(customLintConfig, existingUserSettings);
			workspace
				.getConfiguration()
				.update(configProperty, customLintConfig, ConfigurationTarget.Global);
				output.appendLine(
					`[${msTimeValue}] - Adobe default markdownlint config settings merged with user settings.`
				);
		} else {
			workspace
				.getConfiguration()
				.update(configProperty, customLintConfig, ConfigurationTarget.Global);
				output.appendLine(
					`[${msTimeValue}] - Adobe default markdownlint config settings added to user settings.`
				);
		}
	}

}


/**
 * Method to check for the docs custom markdownlint value.
 * Checks for markdownlint.customRules property.  If markdownlint isn't installed, do nothing.  If markdownlint is installed, check for custom property values.
 */
export function checkMarkdownlintCustomProperty() {
	const { msTimeValue } = generateTimestamp();
	const customProperty = 'markdownlint.customRules';
	const customRuleset = '{adobeexl.adobe-markdown-authoring}/markdownlint-custom-rules/rules.js';
	const docsMarkdownRuleset = '{adobeexl.adobe-markdown-authoring}/markdownlint-custom-rules/rules.js';
	const customPropertyData: any = workspace.getConfiguration().inspect(customProperty);
	// new list for string comparison and updating.
	const existingUserSettings: string[] = [];
	if (customPropertyData) {
		// if the markdownlint.customRules property exists, pull the global values (user settings) into a string.
		if (customPropertyData.globalValue) {
			const valuesToString = customPropertyData.globalValue.toString();
			let individualValues = valuesToString.split(',');
			individualValues.forEach((setting: string) => {
				if (setting === customRuleset) {
					existingUserSettings.push(setting);
				}
			});

			// if the customRuleset already exist, write a notification to the output window and continue.
			if (existingUserSettings.indexOf(customRuleset) > -1) {
				output.appendLine(
					`[${msTimeValue}] - Docs custom markdownlint ruleset is already set at a global level.`
				);
			} else {
				// if the customRuleset does not exists, append it to the other values in the list if there are any or add it as the only value.
				existingUserSettings.push(customRuleset);
				// update the user settings with new/updated values and notify user.
				// if a user has specific workspace settings for customRules, vscode will use those. this is done so we don't override non-docs repos.
				workspace
					.getConfiguration()
					.update(customProperty, existingUserSettings, ConfigurationTarget.Global);
				output.appendLine(
					`[${msTimeValue}] - Docs custom markdownlint ruleset added to user settings.`
				);
			}

			// remove docs-markdown ruleset setting if necessary
			if (individualValues.indexOf(docsMarkdownRuleset) > -1) {
				individualValues = existingUserSettings.filter(userSetting => {
					return userSetting !== docsMarkdownRuleset;
				});
				workspace
					.getConfiguration()
					.update(customProperty, individualValues, ConfigurationTarget.Global);
				output.appendLine(
					`[${msTimeValue}] - docs-markdown custom markdownlint ruleset removed from user settings.`
				);
			}
		}
		// if no custom rules exist, create array and add docs custom ruleset.
		if (customPropertyData.globalValue === undefined) {
			const customPropertyValue = [customRuleset];
			workspace
				.getConfiguration()
				.update(customProperty, customPropertyValue, ConfigurationTarget.Global);
			output.appendLine(
				`[${msTimeValue}] - Docs custom markdownlint ruleset added to user settings.`
			);
		}
	}
}
