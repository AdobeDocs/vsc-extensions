import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { TextEditor } from "vscode";
const vscodeTestContent = require("vscode-test-content");
import * as adobe from "../../extension";

import { getEol } from "../../lib/env";

suite("Bold", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleBold",
      "Lets make a [bold} text!",
      "Lets make a [**bold**} text!"
    );
  });

  test("Collapsed selection", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleBold",
      "Lets make a bo^ld text!",
      "Lets make a [**bold**} text!"
    );
  });

  test("Collapsed selection with unicode characters", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleBold",
      "Lets make a bÔ^ld text!",
      "Lets make a [**bÔld**} text!"
    );
  });

  test("Collapsed selection empty editor", () => {
    // make sure nothing wrong happens when the editor is totally empty.
    return testCommand("toggleBold", "^", "**^**");
  });

  test("Collapsed selection empty surround editor", () => {
    // make sure nothing wrong happens when the editor is surrounded by bold.
    return testCommand("toggleBold", "**^**", "^");
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleBold",
      "Time to **unbo^ld** this statement",
      "Time to [unbold} this statement"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleBold",
      "Time to [**unbold**} this statement",
      "Time to [unbold} this statement"
    );
  });
});

suite("Italic", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleItalic",
      "Lets make a [fancy} text!",
      "Lets make a [_fancy_} text!"
    );
  });

  // test( "Collapsed selection", () => {
  //     // This is likely to be changed with #5.
  //     return testCommand( 'toggleItalic', 'Lets make a fan^cy text!', 'Lets make a [_fancy_} text!' );
  // } );

  // test( "Collapsed selection with unicode characters", () => {
  //     // This is likely to be changed with #5.
  //     return testCommand( 'toggleItalic', 'Lets make a fÄn^cy text!', 'Lets make a [_fÄncy_} text!' );
  // } );

  // test( "Toggles with collapsed selection", () => {
  //     return testCommand( 'toggleItalic', 'Lets make less _fan^cy_ text', 'Lets make less [fancy} text' );
  // } );

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleItalic",
      "Lets make less [_fancy_} text",
      "Lets make less [fancy} text"
    );
  });
});

suite("Strike through", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleStrikethrough",
      "Lets make a [fancy} text!",
      "Lets make a [~~fancy~~} text!"
    );
  });

  test("Collapsed selection", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleStrikethrough",
      "Lets make a fan^cy text!",
      "Lets make a [~~fancy~~} text!"
    );
  });

  test("Collapsed selection with unicode characters", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleStrikethrough",
      "Lets make a fÄn^cy text!",
      "Lets make a [~~fÄncy~~} text!"
    );
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleStrikethrough",
      "Lets make less ~~fan^cy~~ text",
      "Lets make less [fancy} text"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleStrikethrough",
      "Lets make less [~~fancy~~} text",
      "Lets make less [fancy} text"
    );
  });
});

suite("Inline code", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleInlineCode",
      "Lets make a [fancy} text!",
      "Lets make a [`fancy`} text!"
    );
  });

  test("Collapsed selection", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleInlineCode",
      "Lets make a fan^cy text!",
      "Lets make a [`fancy`} text!"
    );
  });

  test("Collapsed selection with unicode selection", () => {
    // This is likely to be changed with #5.
    return testCommand(
      "toggleInlineCode",
      "Lets make a fÄn^cy text!",
      "Lets make a [`fÄncy`} text!"
    );
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleInlineCode",
      "Lets make less `fa^ncy` text",
      "Lets make less [fancy} text"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleInlineCode",
      "Lets make less [`fancy`} text",
      "Lets make less [fancy} text"
    );
  });
});

suite("Headers", () => {
  // For headers we'll generate the tests, so that this test suite doesn't get too bloat.
  for (let i = 1; i <= 6; i++) {
    suite("Level " + i, () => {
      var headerMarker = "#".repeat(i);

      test("Ranged selection", () => {
        return testCommand(
          `toggleTitleH${i}`,
          "Lets make a [fancy} text!",
          `Lets make a [${headerMarker} fancy} text!`
        );
      });

      test("Collapsed selection", () => {
        // This is likely to be changed with #5.
        return testCommand(
          `toggleTitleH${i}`,
          "Lets make a fan^cy text!",
          `[${headerMarker} Lets make a fancy text!}`
        );
      });

      test("Collapsed selection with newline", () => {
        // This is likely to be changed with #5.
        return testCommand(
          `toggleTitleH${i}`,
          "Lets make a fan^cy text!\nAnother line",
          `[${headerMarker} Lets make a fancy text!}\nAnother line`
        );
      });

      test("Toggles with ranged selection", () => {
        return testCommand(
          `toggleTitleH${i}`,
          `[${headerMarker} Lets make less fancy text}`,
          "[Lets make less fancy text}"
        );
      });

      test("Toggles with collapsed selection", () => {
        return testCommand(
          `toggleTitleH${i}`,
          `${headerMarker} Lets make ^less fancy text`,
          "[Lets make less fancy text}"
        );
      });
    });
  }
});

var newLine = getEol();
suite("Block code", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "[some code}",
      "[```\nsome code\n```}"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "[some code" + newLine + "more code}",
      "[```\nsome code\nmore code\n```}"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleCodeBlock",
      "[some code" + newLine + "more code}" + newLine,
      "[```\nsome code\nmore code\n```}"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleCodeBlock",
      "[some code" + newLine + "more code" + newLine + "}",
      "[```\nsome code\nmore code\n\n```}"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "Some code^",
      "[```\nSome code\n```}"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "[```\nsome code\n```}",
      "[some code}"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleCodeBlock",
      "[```" + newLine + "some code" + newLine + "more code" + newLine + "```}",
      "[some code\nmore code}"
    );
  });

  //TODO: are these possible?
  // test( "Toggles with collapsed selection", () => {
  //     return testCommand( 'toggleCodeBlock', '```' + newLine + 'some^ code' + newLine + '```', '[some code}' );
  // } );

  // test( "Toggles with multiline collapsed selection", () => {
  //     return testCommand( 'toggleCodeBlock', '```' + newLine + 'some^ code' + newLine + 'more code' + newLine + '```', '[some code\nmore code}' );
  // } );
});

suite("Bullets", () => {
  // beforeEach(() => {
  // });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleBullets",
      "A line for bul^lets",
      "[* A line for bullets}"
    );
  });

  test("Ranged selection", () => {
    return testCommand(
      "toggleBullets",
      "A li[st\nOf Ite}ms",
      "* A [list\n* Of} Items"
    );
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleBullets",
      "* A line for bul^lets",
      "[A line for bullets}"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleBullets",
      "* A bullet[ed li}st",
      "A bulleted[ list}"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleBullets",
      "* A li[st\n* Of Ite}ms",
      "A list[\nOf Items}"
    );
  });
});

suite("Note Alerts", () => {
  test("Ranged selection", () => {
    return testCommand(
      "toggleNote",
      "[This is just a plain note}",
      "[>[!NOTE]\n>\n>This is just a plain note\n}"
    );
  });

  test("Multiline ranged selection", () => {
    return testCommand(
      "toggleNote",
      "[This is just a" + newLine + "plain note}",
      "[>[!NOTE]\n>\n>This is just a\nplain note\n}"
    );
  });

  test("Multiline ranged selection with extra newline", () => {
    return testCommand(
      "toggleNote",
      "[This is just a" + newLine + "plain note}" + newLine,
      "[>[!NOTE]\n>\n>This is just a\nplain note\n}"
    );
  });

  test("Multiline ranged selection while selecting extra newline", () => {
    return testCommand(
      "toggleNote",
      "[This is just a" + newLine + "plain note" + newLine + "}",
      "[>[!NOTE]\n>\n>This is just a\nplain note\n\n}"
    );
  });

  test("Collapsed selection", () => {
    return testCommand(
      "toggleNote",
      "Just a plain note^",
      "[>[!NOTE]\n>\n>Just a plain note\n}"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleNote",
      "[>[!NOTE]" +
        newLine +
        ">" +
        newLine +
        ">This is just a plain note" +
        newLine +
        "}",
      "[This is just a plain note}"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleNote",
      "[>[!NOTE]" +
        newLine +
        ">" +
        newLine +
        ">This is just a" +
        newLine +
        "plain note}",
      "[This is just a\nplain note}"
    );
  });
});

suite("Citations", () => {
  test("Collapsed selection", () => {
    return testCommand(
      "toggleCitations",
      "A line for ci^tation",
      "[> A line for citation}"
    );
  });

  test("Ranged selection", () => {
    return testCommand(
      "toggleCitations",
      "A li[st\nOf Citatio}ns",
      "> A li[st\n> Of Citatio}ns"
    );
  });

  test("Ranged selection with blank lines", () => {
    return testCommand(
      "toggleCitations",
      "A li[st\n\n\nOf Citatio}ns",
      "> A li[st\n> \n> \n> Of Citatio}ns"
    );
  });

  test("Toggles with collapsed selection", () => {
    return testCommand(
      "toggleCitations",
      "> A line for ci^tation",
      "[A line for citation}"
    );
  });

  test("Toggles with ranged selection", () => {
    return testCommand(
      "toggleCitations",
      "> A norm[al citatio}n",
      "A normal[ citation}"
    );
  });

  test("Toggles with multi-line ranged selection", () => {
    return testCommand(
      "toggleCitations",
      "> A li[st\n> Of Citatio}ns",
      "A list[\nOf Citations}"
    );
  });
});

const testCommand = (
  command: string,
  inputContent: string,
  expectedContent: string
): Thenable<TextEditor> => {
  return vscodeTestContent
    .setWithSelection(inputContent)
    .then((editor: TextEditor) => {
      return vscode.commands
        .executeCommand("md-shortcut." + command)
        .then(() =>
          assert.strictEqual(
            vscodeTestContent.getWithSelection(editor),
            expectedContent
          )
        )
        .then(() => editor);
    });
};
