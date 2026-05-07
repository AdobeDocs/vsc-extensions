# Change Log

All notable changes to the ExL Markdown Authoring extension are documented here.

## [2.0.0]

### Added

- **Updated Preview** to better reflect ExL styling. Typography, tables, alert boxes, tabs/collapsible panels and code block coloring are all accurate.
- **GitHub Actions CI Monitor** — sidebar panel replaces Jenkins monitor; uses `gh` CLI token, no manual credentials required
- **Auto-fix** — one-click fixes for 15+ markdownlint rules directly from the panel (AM007, AM009, AM011/AM019, AM013, MD001, MD004, MD009, MD010, MD018, MD019, MD022, MD023, MD029, MD031/MD032, MD047)
- **Local lint** — runs markdownlint and cspell against locally changed files on every refresh, before you push
- **VS Code diagnostics** — CI errors published to the Problems panel for visibility by AI coding assistants
- **Toggle Tabs** — insert `>[!BEGINTABS]` / `>[!ENDTABS]` block via command palette or context menu
- **Toggle Shadebox** — insert `>[!BEGINSHADEBOX]` / `>[!ENDSHADEBOX]` block
- **Toggle Collapsible** — insert `+++Title` / `+++` collapsible section
- **Prism syntax highlighting** — added JSON, TypeScript, Python, SQL, YAML, and more to the preview panel
- **Updated Linting** - incorporated the latest Adobe markdownlinting rules.

## [1.1.7]

- Maintenance release (see upstream history)

## [1.0.0]

- Initial release
