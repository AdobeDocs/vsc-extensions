# Preview fonts (bundled)

WOFF2 files here power **Adobe Preview** so typography works offline and without CDN / Typekit domain allowlisting on `vscode-webview://`.

| Family | Role | License |
| --- | --- | --- |
| [Roboto](https://fonts.google.com/specimen/Roboto) | Body & headings (Experience League) | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono) | `code` & fenced blocks | [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) |

`@font-face` rules live in **`assets/styles/preview-fonts.css`** using `url(../fonts/preview/…)` so URLs resolve from the linked stylesheet’s webview location.

## Refreshing from npm

After bumping `@fontsource/roboto` or `@fontsource/roboto-mono`, run:

```bash
npm run sync-preview-fonts
```

Then add or adjust `@font-face` entries in `assets/styles/preview-fonts.css` to match copied filenames.

`vscode:prepublish` runs `sync-preview-fonts` before compile so packaged builds include current WOFF2 files.

To use **Adobe Clean** or other WOFF2 files instead, replace the files in this folder and update `preview-fonts.css` accordingly.
