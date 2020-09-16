# Adobe Experience League Markdown Authoring

This is a VS Code extension that enhances the built-in Markdown preview feaures with Adobe extensions to the Markdown specification.

Currently this plugin extends the [CommonMark](https://spec.commonmark.org/) specification, which is slightly different from the Git-flavored Markdown described in the [Adobe Internal Authoring Guide](https://docs.adobe.com/content/help/en/collaborative-doc-instructions/collaboration-guide/markdown/syntax-style-guide.html).

## Features

In addition to the standard markdown preview features provided by VS Code that adhere to the CommonMark specification, this extension attempts to provide a high-fidelity representation of Markdown that adheres to the custom Markdown syntax specified in the [Adobe Markdown Syntax Style Guide](https://docs.adobe.com/content/help/en/collaborative-doc-instructions/collaboration-guide/markdown/syntax-style-guide.html).

### Supported Markdown extensions

* Note, Caution, Important, Tip, and Warning
* Embedded video
* More Like This
* Various UI tags for localization

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

### Caution

```markdown
>[!CAUTION]
>
>Here is a caution component. Notice that it is just a blockquote and that you can _embed_ inline markdown including `pre-formatted text` and other **chicanery**
```

>[!CAUTION]
>
> Here is a caution component. Notice that it is just a blockquote and that you can _embed_ inline markdown including `pre-formatted text` and other **chicanery**

>[!TIP]
>
> Here is a tip [!TIP] This is after this.


### Important

```markdown
> [!IMPORTANT]
>
> Here is the _IMPORTANT_ component. It's only one line.
```

>[!IMPORTANT]
>
> Here is the _IMPORTANT_ component. It's only one line.

### Tip

### Video

>[!VIDEO](https://youtube.com?watch="xyxz")

## Authoring Shortcuts


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

## Extension Settings

Since this is an expansion on the built-in VS Code preview extension, any settings applicable to that extension also apply to this one.  You can find more information about support for Markdown in Visual Studio Code at in the [Visual Studio Code online documentation](https://code.visualstudio.com/Docs/languages/markdown).

## Known Issues

The hover CSS styles for Alerts (Note, Caution, Important, Tip and Warning) do not have the desired effect. Formatting is somewhat jumbled.

## Release Notes

Here are the changes since the last release.

### 1.0.0

Initial release of Adobe Markdown Authoring extension for VSCode

---

### For more information

- [Adobe Internal Authoring Guide](https://docs.adobe.com/content/help/en/collaborative-doc-instructions/collaboration-guide/home.html)
- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
