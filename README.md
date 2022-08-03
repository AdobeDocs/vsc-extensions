# Adobe Experience League Markdown Authoring

This is a Visual Studio Code extension that enhances the built-in Markdown preview feaures with Adobe extensions to the Markdown specification.

Currently this plugin extends the [CommonMark](https://spec.commonmark.org/) specification, which is slightly different from the Git-flavored Markdown described in the [Adobe Contributor Guide](https://experienceleague.adobe.com/docs/contributor/contributor-guide/writing-essentials/markdown.html).

## Features

In addition to the standard markdown preview features provided by VS Code that adhere to the CommonMark specification, this extension attempts to provide a high-fidelity representation of Markdown that adheres to the custom Markdown syntax specified in the [Adobe Markdown Syntax Style Guide](https://experienceleague.adobe.com/docs/contributor/contributor-guide/writing-essentials/markdown.html).

### Supported Markdown extensions

- Note, Caution, Important, Tip, Warning, Admin, Availability, Prerequisites
- Embedded video
- More Like This
- Various UI tags for localization

## Installation

The easiest way to install the Adobe Visual Studio Code Markdown Extensions is from the Visual Studio Code extension marketplace.  

1. Install Visual Studio Code 1.44.0 or higher
2. Launch Code
3. From the command palette Ctrl-Shift-P (Windows, Linux) or Cmd-Shift-P (OSX)
4. Select Install Extension
5. Choose the extension
6. Reload Visual Studio Code

## Examples

Here are some examples of the Adobe extensions in action. If you have the extension installed, it will format this document in the built-in VSCode preview panel. If you do not have the extension installed, the generic VSCode Markdown Preview will use the CommonMark spec to render the alert extensions as block quotes.

### Note

```markdown
>[!NOTE]
>
>Here is a note component. Notice that it is just a blockquote that has a [!NOTE] label at the beginning of the code.
```

>[!NOTE]
>
>Here is a note component. Notice that it is just a blockquote that has a [!NOTE] label at the beginning of the code.

![note](https://bitbucket.org/oproma/adobe-markdown-authoring/raw/0dec36082266468ca5601a83320bff2700ed1487/assets/img/NOTE.gif)

### Caution

```markdown
>[!CAUTION]
>
>Here is a caution component. Notice that it is just a blockquote and that you can _embed_ inline markdown including `pre-formatted text` and other **chicanery**
```

>[!CAUTION]
>
> Here is a caution component. Notice that it is just a blockquote and that you can _embed_ inline markdown including `pre-formatted text` and other **chicanery**

![caution](https://bitbucket.org/oproma/adobe-markdown-authoring/raw/0dec36082266468ca5601a83320bff2700ed1487/assets/img/CAUTION.gif)

>[!TIP]
>
> Here is a tip [!TIP] This is after this.

![tip](https://bitbucket.org/oproma/adobe-markdown-authoring/raw/0dec36082266468ca5601a83320bff2700ed1487/assets/img/TIP.gif)

### Important

```markdown
> [!IMPORTANT]
>
> Here is the _IMPORTANT_ component. It's only one line.
```

>[!IMPORTANT]
>
> Here is the _IMPORTANT_ component. It's only one line.

![important](https://bitbucket.org/oproma/adobe-markdown-authoring/raw/0dec36082266468ca5601a83320bff2700ed1487/assets/img/IMPORTANT.gif)

### Tip

```markdown
> [!TIP]
>
> Here is the _TIP_ component. It's only one line.
```

### Video

>[!VIDEO](https://youtube.com?watch="xyxz")

![video](https://bitbucket.org/oproma/adobe-markdown-authoring/raw/0dec36082266468ca5601a83320bff2700ed1487/assets/img/VIDEO.gif)


## Exposed Commands

| Name | Description | Default key binding |
| ---- | ----------- | ------------------- |
| md-shortcut.showCommandPalette | Display all commands | ctrl+M ctrl+M |
| md-shortcut.toggleBold | Make \*\*bold\*\* | ctrl+B |
| md-shortcut.toggleItalic | Make \_italic\_ | ctrl+I |
| md-shortcut.toggleStrikethrough | Make \~\~strikethrough\~\~ |  |
| md-shortcut.toggleLink | Make [a hyperlink]\(www.example.org) | ctrl+L |
| md-shortcut.toggleImage | Make an image ![]\(image_url.png) | ctrl+shift+L |
| md-shortcut.toggleCodeBlock | Make \`\`\`a code block\`\`\` | ctrl+M ctrl+C |
| md-shortcut.toggleInlineCode | Make \`inline code\` | ctrl+M ctrl+I |
| md-shortcut.toggleBullets | Make * bullet point | ctrl+M ctrl+B |
| md-shortcut.toggleNumbers | Make 1. numbered list | ctrl+M ctrl+1 |
| md-shortcut.toggleCheckboxes | Make - [ ] check list (Github flavored markdown) | ctrl+M ctrl+X |
| md-shortcut.toggleTitleH1 | Toggle # H1 title |  |
| md-shortcut.toggleTitleH2 | Toggle ## H2 title |  |
| md-shortcut.toggleTitleH3 | Toggle ### H3 title |  |
| md-shortcut.toggleTitleH4 | Toggle #### H4 title |  |
| md-shortcut.toggleTitleH5 | Toggle ##### H5 title |  |
| md-shortcut.toggleTitleH6 | Toggle ###### H6 title |  |
| md-shortcut.addTable | Add Tabular values |  |
| md-shortcut.addTableWithHeader | Add Tabular values with header |  |
| md-shortcut.toggleNote | Make a [!NOTE] block | ctrl+m ctrl+n |
| md-shortcut.toggleTip | Make a [!TIP] block | ctrl+m ctrl+t |
| md-shortcut.toggleCaution | Make a [!CAUTION] block | ctrl+m ctrl+c |
| md-shortcut.toggleImportant | Make an [!IMPORTANT] block | ctrl+m ctrl+p |
| md-shortcut.toggleWarning | Make a [!WARNING] block | ctrl+m ctrl+w |
| md-shortcut.toggleMoreLikeThis | Make a [!MORELIKETHIS] block | ctrl+m ctrl+m |
| md-shortcut.toggleVideo | Make a [!VIDEO] block | ctrl+m ctrl+v |
| md-shortcut.toggleDNL | Make a [!DNL] block | ctrl+m ctrl+d |
| md-shortcut.toggleUIControl | Make a [!UICONTROL] block | ctrl+m ctrl+u |

## Markdown Lint Validation Settings

This package uses David Anson's Markdown-Lint package to validate the markdown.  In addition to the built-in validation rules, this package adds support for Adobe Flavored Markdown.  

### Changing the Markdown-Lint Validation Settings

When it starts up for the first time the Adobe Markdown Authoring extension will look for existing settings in the VSCode Settings.  If it does not find them, it will add the default settings below.  If it does find them, it will default to the values found in the user settings.

To change the settings, go to Preferences > Settings > markdownlint.

```
markdownlint.config: {
    "line-length": false,
    "AM001": false,
    "AM009": false,
    "AM011": false,
    "MD003": {
      "style": "atx"
    },
    "MD004": {
      "style": "dash"
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
  }
```
### Custom Rules

In addition to the standard support MD### rules, Adobe Markdown Extension supports AM### rules, which are specific to 
Adobe Flavored Markdown.

```
  "markdownlint.customRules": [
    "{adobeexl.adobe-markdown-authoring}/markdownlint-custom-rules/rules.js"
  ]
```


## Extension Settings

Since this is an expansion on the built-in VS Code preview extension, any settings applicable to that extension also apply to this one.  You can find more information about support for Markdown in Visual Studio Code at in the [Visual Studio Code online documentation](https://code.visualstudio.com/Docs/languages/markdown).

---

### For more information

- [Adobe Contributor Guide](https://experienceleague.adobe.com/docs/contributor/contributor-guide/introduction.html)
- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
- [David Anson's Markdown Lint](https://github.com/DavidAnson/markdownlint)
- [VS Code version of Markdown Lint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)

