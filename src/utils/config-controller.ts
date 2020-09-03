"use strict";

import { ConfigurationTarget, workspace } from "vscode";
import { output, generateTimestamp } from "./common";
/**
 * Method to check for the Adobe custom markdownlint value.
 * Checks for markdownlint.customRules property.  If markdownlint isn't installed, do nothing.
 * If markdownlint is installed, check for custom property values.
 */
export function checkMarkdownlintCustomProperty() {
  const { msTimeValue } = generateTimestamp();
  const customProperty = "markdownlint.customRules";
  const customRuleset =
    "{adobe.adobe-markdown-authoring}/markdownlint-custom-rules/rules.js";
  const customPropertyData: any = workspace
    .getConfiguration()
    .inspect(customProperty);
  // new list for string comparison and updating.
  const existingUserSettings: string[] = [];
  if (customPropertyData) {
    // if the markdownlint.customRules property exists, pull the global values (user settings) into a string.
    if (customPropertyData.globalValue) {
      const valuesToString = customPropertyData.globalValue.toString();
      let individualValues = valuesToString.split(",");
      individualValues.forEach((setting: string) => {
        if (setting === customRuleset) {
          existingUserSettings.push(setting);
        }
      });

      // if the customRuleset already exist, write a notification to the output window and continue.
      if (existingUserSettings.indexOf(customRuleset) > -1) {
        output.appendLine(
          `[${msTimeValue}] - Adobe custom markdownlint ruleset is already set at a global level.`
        );
      } else {
        // if the customRuleset does not exists, append it to the other values in the list if there 
        // are any or add it as the only value.
        existingUserSettings.push(customRuleset);
        // update the user settings with new/updated values and notify user.
        // if a user has specific workspace settings for customRules, vscode will use those.
        // this is done so we don't override non-docs repos.
        workspace
          .getConfiguration()
          .update(
            customProperty,
            existingUserSettings,
            ConfigurationTarget.Global
          );
        output.appendLine(
          `[${msTimeValue}] - Adobe Exl custom markdownlint ruleset added to user settings.`
        );
      }
    }
    // if no custom rules exist, create array and add Adobe Exl custom ruleset.
    if (customPropertyData.globalValue === undefined) {
      const customPropertyValue = [customRuleset];
      workspace
        .getConfiguration()
        .update(
          customProperty,
          customPropertyValue,
          ConfigurationTarget.Global
        );
      output.appendLine(
        `[${msTimeValue}] - Adobe Exl custom markdownlint ruleset added to user settings.`
      );
    }
  }
}
