import * as vscode from "vscode";

import { getEol } from "./env";

import { ExtensionContext, QuickPickOptions, QuickPickItem } from "vscode";

import { addTable } from "./tables";

import { toggleAdministration } from "./commands/toggle-administration";
import { toggleAvailability } from "./commands/toggle-availability";
import { toggleBold } from "./commands/toggle-bold";
import { toggleBullets } from "./commands/toggle-bullets";
import { toggleCaution } from "./commands/toggle-caution";
import { toggleCheckboxes } from "./commands/toggle-checkboxes";
import { toggleCodeBlock, toggleInlineCode } from "./commands/toggle-code";
import { toggleDNL } from "./commands/toggle-dnl";
import { toggleError } from "./commands/toggle-error";
import {
  toggleTitleH1,
  toggleTitleH2,
  toggleTitleH3,
  toggleTitleH4,
  toggleTitleH5,
  toggleTitleH6,
} from "./commands/toggle-headers";
import { toggleImage } from "./commands/toggle-image";
import { toggleImportant } from "./commands/toggle-important";
import { toggleInfo } from "./commands/toggle-info";
import { toggleItalic } from "./commands/toggle-italic";
import { toggleLink } from "./commands/toggle-link";
import { toggleMoreLikeThis } from "./commands/toggle-morelikethis";
import { toggleNote } from "./commands/toggle-note";
import { toggleNumberList } from "./commands/toggle-numberlist";
import { togglePrerequisites } from "./commands/toggle-prerequisites";
import { toggleStrikethrough } from "./commands/toggle-strikethrough";
import { toggleSuccess } from "./commands/toggle-success";
import { toggleTip } from "./commands/toggle-tip";
import { toggleUIControl } from "./commands/toggle-uicontrol";
import { toggleVideo } from "./commands/toggle-video";
import { toggleWarning } from "./commands/toggle-warning";

interface CommandItem extends QuickPickItem {
  label: string;
}

class Command implements CommandItem {
  command: string;
  description?: string;
  showInCommandPalette: boolean;
  callback: () => void;
  label: string;

  constructor(
    command: string,
    callback: () => void,
    label: string,
    description?: string,
    showInCommandPalette?: boolean
  ) {
    this.command = command;
    this.callback = callback;
    this.label = label;
    this.description = description;
    this.showInCommandPalette = showInCommandPalette
      ? showInCommandPalette
      : false;
  }
}

const _commands: Command[] = [
  new Command(
    "toggleStrikethrough",
    toggleStrikethrough,
    "Toggle Strikethrough",
    "~~Strikethrough text~~",
    true
  ),
  new Command(
    "showCommandPalette",
    showCommandPalette,
    "Show Command Palette",
    "",
    false
  ),
  new Command("toggleBold", toggleBold, "Toggle bold", "**Bold text**", true),
  new Command(
    "toggleItalic",
    toggleItalic,
    "Toggle italic",
    "_italic text_",
    true
  ),
  new Command(
    "toggleCodeBlock",
    toggleCodeBlock,
    "Toggle code block",
    "```Code block```",
    true
  ),
  new Command(
    "toggleInlineCode",
    toggleInlineCode,
    "Toggle inline code",
    "`Inline code`",
    true
  ),
  new Command(
    "toggleLink",
    toggleLink,
    "Toggle hyperlink",
    "[Link text](link_url)",
    true
  ),
  new Command(
    "toggleImage",
    toggleImage,
    "Toggle image",
    "![](image_url)",
    true
  ),
  new Command(
    "toggleBullets",
    toggleBullets,
    "Toggle bullet points",
    "* Bullet point",
    true
  ),
  new Command(
    "toggleNumbers",
    toggleNumberList,
    "Toggle number list",
    "1 Numbered list item",
    true
  ),
  new Command(
    "toggleTitleH1",
    toggleTitleH1,
    "Toggle title H1",
    "# Title",
    true
  ),
  new Command(
    "toggleTitleH2",
    toggleTitleH2,
    "Toggle title H2",
    "## Title",
    true
  ),
  new Command(
    "toggleTitleH3",
    toggleTitleH3,
    "Toggle title H3",
    "### Title",
    true
  ),
  new Command(
    "toggleTitleH4",
    toggleTitleH4,
    "Toggle title H4",
    "#### Title",
    true
  ),
  new Command(
    "toggleTitleH5",
    toggleTitleH5,
    "Toggle title H5",
    "##### Title",
    true
  ),
  new Command(
    "toggleTitleH6",
    toggleTitleH6,
    "Toggle title H6",
    "###### Title",
    true
  ),
  new Command(
    "toggleCheckboxes",
    toggleCheckboxes,
    "Toggle checkboxes",
    "- [x] Checkbox item",
    true
  ),
  new Command("addTable", addTable, "Add table", "Tabular | values", true),
  // Adobe Specific Commands
  new Command(
    "toggleNote",
    toggleNote,
    "Toggle note",
    ">[!NOTE]\r\n>This is a NOTE block.",
    true
  ),
  new Command(
    "toggleTip",
    toggleTip,
    "Toggle tip",
    ">[!TIP]\r\n>This is a TIP.",
    true
  ),
  new Command(
    "toggleCaution",
    toggleCaution,
    "Toggle caution",
    ">[!CAUTION]\r\n>This is a Caution block.",
    true
  ),
  new Command(
    "toggleWarning",
    toggleWarning,
    "Toggle warning",
    ">[!Warning]\r\n>This is a Warning block.",
    true
  ),
  new Command(
    "toggleImportant",
    toggleImportant,
    "Toggle Important",
    ">[!IMPORTANT]\r\n>This is a IMPORTANT block.",
    true
  ),
  new Command(
    "toggleAdministration",
    toggleAdministration,
    "Toggle administration",
    ">[!ADMINISTRATION]\r\n>This is a ADMINISTRATION block.",
    true
  ),
  new Command(
    "toggleAvailability",
    toggleAvailability,
    "Toggle availability",
    ">[!AVAILABILITY]\r\n>This is a AVAILABILITY block.",
    true
  ),
  new Command(
    "togglePrerequisites",
    togglePrerequisites,
    "Toggle Prerequisites",
    ">[!PREREQUISITES]\r\n>This is a PREREQUISITES block.",
    true
  ),
  new Command(
    "toggleError",
    toggleError,
    "Toggle Error",
    ">[!ERROR]\r\n>This is a ERROR block.",
    true
  ),
  new Command(
    "toggleInfo",
    toggleInfo,
    "Toggle Info",
    ">[!INFO]\r\n>This is a INFO block.",
    true
  ),
  new Command(
    "toggleSuccess",
    toggleSuccess,
    "Toggle Success",
    ">[!SUCCESS]\r\n>This is a SUCCESS block.",
    true
  ),
  new Command(
    "toggleMoreLikeThis",
    toggleMoreLikeThis,
    "Toggle More Like This",
    ">[!MORELIKETHIS]\r\n>This is a MORE LIKE THIS block.",
    true
  ),
  new Command(
    "toggleVideo",
    toggleVideo,
    "Toggle video",
    ">[!VIDEO](video_url))",
    true
  ),

  new Command(
    "toggleDNL",
    toggleDNL,
    "Toggle DNL",
    "[!DNL unlocalized text]",
    true
  ),

  new Command(
    "toggleUIControl",
    toggleUIControl,
    "Toggle UIControl",
    "[!UICONTROL text to be translated]",
    true
  ),
];

export function register(context: ExtensionContext) {
  _commands.map((cmd) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "md-shortcut." + cmd.command,
        cmd.callback
      )
    );
  });
}

function showCommandPalette() {
  const options: QuickPickOptions = { matchOnDescription: true };
  vscode.window
    .showQuickPick(
      _commands.filter((cmd) => cmd.showInCommandPalette),
      options
    )
    .then((cmd) => {
      if (!cmd) {
        return;
      }
      cmd.callback();
    });
}

export const urlRegExp: RegExp =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
