# Adobe Experience League Markdown Preview README

This is a VS Code extension that enhances the built-in Markdown preview feaures with Adobe extensions to the Markdown specification.

Currently this plugin extends the [CommonMark](https://spec.commonmark.org/) specification, which is slightly different from the Git-flavored Markdown described in the [Adobe Internal Authoring Guide](https://docs.adobe.com/content/help/en/collaborative-doc-instructions/collaboration-guide/markdown/syntax-style-guide.html).

## Features

In addition to the standard markdown preview features provided by VS Code that adhere to the CommonMark specification, this extension attempts to provide a high-fidelity representation of Markdown that adheres to the custom Markdown syntax specified in the [Adobe Markdown Syntax Style Guide](https://docs.adobe.com/content/help/en/collaborative-doc-instructions/collaboration-guide/markdown/syntax-style-guide.html).

### Supported extensions

- Note, Caution, Important, Tip, and Warning
- Embedded video
- More Like This
- Various UI tags for localization

## Examples

Here are some examples of the Adobe extensions in action. If you have the extension installed, it will format this document in the built-in VSCode preview panel. If you do not have the extension installed, the generic VSCode Markdown Preview will use the CommonMark spec to render the alert extensions as block quotes.

### Note

```markdown
> [!NOTE]
>
> Here is a note component. Notice that it is just a blockquote that has a [!NOTE] label at the beginning of the code.
```

> [!NOTE]
>
> Here is a note component. Notice that it is just a blockquote that has a [!NOTE] label at the beginning of the code.

### Caution

```markdown
> [!CAUTION]
>
> Here is a caution component. Notice that it is just a blockquote and that you can _embed_ inline markdown including `pre-formatted text` and other **chicanery**
```

> [!CAUTION]
>
> Here is a caution component. Notice that it is just a blockquote and that you can _embed_ inline markdown including `pre-formatted text` and other **chicanery**

> [!TIP]
>
> Here is a tip [!TIP] This is after this.

### Important

```markdown
> [!IMPORTANT]
>
> Here is the _IMPORTANT_ component. It's only one line.
```

> [!IMPORTANT]
>
> Here is the _IMPORTANT_ component. It's only one line.

### Tip

### Video

> [!VIDEO](https://youtube.com?watch="xyxz")

> [!CAUTION]

## Extension Settings

Since this is an expansion on the built-in VS Code preview extension, any settings applicable to that extension also apply to this one.

## Known Issues

The hover CSS styles for Alerts (Note, Caution, Important, Tip and Warning) do not have the desired effect. Formatting is somewhat jumbled.

## Release Notes

Here are the changes since the last release.

### 1.0.0

Initial release of Exl Markdown Preview.

---

### For more information

- [Adobe Internal Authoring Guide](https://docs.adobe.com/content/help/en/collaborative-doc-instructions/collaboration-guide/home.html)
- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
