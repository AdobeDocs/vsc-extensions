# EXL Link Repair — Reference Context for Claude

This file is bundled with the Adobe EXL Markdown Authoring extension and injected into the
Claude system prompt when the "Apply Fixes" action runs. It describes the documentation
platform conventions Claude must follow when analysing and repairing broken links.

---

## Platform overview

Adobe Experience League (EXL) documentation is authored in Markdown and published to
`experienceleague.adobe.com`. Repositories follow a standard layout:

- Content lives under `help/`
- Navigation is defined in `help/TOC.md`
- Internal links are relative paths ending in `.md` (e.g. `../rest-api/authentication.md`)
- External links use full `https://` URLs

The Marketo developer documentation (`marketo-developer.en`) also cross-links to the
Marketo REST API reference hosted at `https://developer.adobe.com/marketo-apis/`.

### Authoring guide

For full EXL Markdown authoring rules, the canonical reference is the Experience League
Authoring Guide. Key articles:

- Linking rules: `https://experienceleague.adobe.com/en/docs/authoring-guide-exl/using/authoring/features/links`
- Markdown basics: `https://experienceleague.adobe.com/en/docs/authoring-guide-exl/using/authoring/markdown-basics`
- Metadata/frontmatter: `https://experienceleague.adobe.com/en/docs/authoring-guide-exl/using/authoring/features/metadata`

---

## Known link error patterns

### 1. External URL trailing slash

The CI link checker flags external URLs that end with `/` because the server returns
a redirect rather than a 200. Remove the trailing slash.

- `https://example.com/page/` → `https://example.com/page`
- `https://example.com/page/#anchor` → `https://example.com/page#anchor`

### 2. Internal link missing `.md` extension

EXL internal links must end in `.md`. A link to `some-page` or `some-page/` will not
resolve at publish time.

- `[text](../rest-api/authentication)` → `[text](../rest-api/authentication.md)`
- `[text](../rest-api/authentication/)` → `[text](../rest-api/authentication.md)`

### 3. Internal link with wrong path prefix

The file exists in the repository but moved. The link basename is correct but the
directory path is wrong. Find the file by basename and compute the correct relative path
from the source file.

### 4. Absolute internal link

Links starting with `/help/...` are repo-relative, not truly absolute. Convert to a
proper relative path from the source file.

- `/help/rest-api/leads.md` (from `help/rest-api/authentication.md`) → `leads.md`

### 5. Old Redocly operation paths (marketo-apis)

The Marketo REST API reference at `developer.adobe.com/marketo-apis/` is a Redocly SPA.
The old fragment format (`#operation/<operationId>`) is no longer supported by the current
Redocly version. Strip the old fragment and leave just the bare `#` so the SPA loads at
the root of the relevant spec.

- `https://developer.adobe.com/marketo-apis/api/mapi#operation/SubmitFormUsingPOST`
  → `https://developer.adobe.com/marketo-apis/api/mapi#`
- `https://developer.adobe.com/marketo-apis/api/user/#operation/getUsersUsingGET`
  → `https://developer.adobe.com/marketo-apis/api/user#`

The new Redocly fragment format (`#tag/<Tag>/operation/<operationId>`) IS supported and
should be left untouched — these are valid deep links even though the link checker cannot
verify them (it strips the hash before sending the HTTP request).

- `https://developer.adobe.com/marketo-apis/api/user#tag/User-Management/operation/getUserUsingGET`
  → leave as-is (mark skip with reason "SPA deep link — false positive")

Base marketo-apis URLs without any fragment redirect through the SPA root (`#`). If the
source file has these without a trailing slash and without a fragment, they are already in
the correct form — mark skip with reason "false positive, file already correct".

### 6. Known false positives — domains that block automated link checkers

These domains return 403/gateway errors to the CI link checker but are valid URLs.
Mark them skip with reason "false positive — host blocks automated checkers":

- `developer.apple.com` — Apple blocks automated HTTP requests with a gateway error
- `docs.microsoft.com` / `learn.microsoft.com` — Microsoft throttles automated checkers
- `linkedin.com` — blocks crawlers entirely

---

## De-linking broken references

When a target file has been deleted and cannot be found anywhere in the repository, remove
the link wrapper but keep the link text:

- `[link text](broken-url)` → `link text`
- `<a href="broken-url">text</a>` → `text`

**Never delete** Adobe admonition blocks (`>[!NOTE]`, `>[!TIP]`, `>[!MORELIKETHIS]`, etc.)
even when they contain broken links. Only remove the link inside the block; leave the
block itself intact.

After de-linking, remove any orphaned `{target="_blank"}` that is no longer attached to a
link (i.e. not immediately preceded by `)`).

---

## Fix strategy — apply in order

Before de-linking, always try to fix. Apply in this order:

1. **Trailing slash** — remove it; try with and without `.md`
2. **Missing `.md`** — append `.md`; verify the file exists
3. **Wrong path** — search repo for the basename; if exactly one match, repoint
4. **Deleted file** — only de-link after confirming no file exists anywhere in the repo

---

## Output format

Respond with one NDJSON object per line. No prose, no markdown, no explanation outside
the JSON values.

```
{"action":"fix","file":"<repo-relative path>","find":"<exact string from file>","replace":"<replacement string>"}
{"action":"skip","file":"<repo-relative path>","reason":"<why no fix — e.g. false positive, SPA deep link>"}
{"action":"note","file":"<repo-relative path>","text":"<observation about a related issue found in the file>"}
```

- `file` must match the path exactly as provided in the prompt
- `find` must be the **exact** string as it appears in the file (copy-paste accurate)
- If a URL appears multiple times in the same file with the same problem, one fix action is
  enough (the replacement applies to all occurrences)
- Do not fabricate fixes for URLs you are uncertain about — use `skip` with a reason
