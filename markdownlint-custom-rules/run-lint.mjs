// @ts-check
// ESM bridge: called by local-lint-service.ts via spawnSync.
// argv: node run-lint.mjs <rulesPath> <repoRoot> <file1> [file2 ...]
// Outputs JSON to stdout: { [absFilePath]: LintError[] }
// Exits 0 always (even with lint errors); non-zero only on script errors.

import { lint } from "markdownlint-cli2/markdownlint/promise";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const [rulesPath, repoRoot, ...files] = process.argv.slice(2);

if (!rulesPath || !repoRoot || files.length === 0) {
  process.stderr.write("Usage: run-lint.mjs <rulesPath> <repoRoot> <file> ...\n");
  process.exit(2);
}

// Load custom rules (default export is an array of rule objects)
const { default: customRules } = await import(pathToFileURL(rulesPath).href);

// Read repo-level markdownlint config if present
const configPath = path.join(repoRoot, ".markdownlint.json");
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf8"))
  : {
      MD013: false,
      MD025: false,  // EXL convention: frontmatter title + H1 heading coexist
      MD028: false,  // EXL admonition syntax requires blank > line between tag and content
      MD033: false,  // EXL docs use HTML tables for complex layouts
    };

const markdownItFactory = async () => {
  const { default: markdownIt } = await import("markdown-it");
  return markdownIt({ html: true });
};

const results = await lint({ files, config, customRules, markdownItFactory });

process.stdout.write(JSON.stringify(results));
