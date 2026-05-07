import yaml from "js-yaml";

export function slugify(str) {
  return encodeURIComponent(String(str).trim().toLowerCase().replace(/\s+/g, '-'));
}

export function rangeFromRegExp(line, regexp) {
  let range = null;
  const match = line.match(regexp);
  if (match) {
    let column = match.index + 1;
    let length = match[0].length;
    if (match[2]) {
      column += match[1].length;
      length -= match[1].length;
    }
    range = [column, length];
  }
  return range;
}

export function addError(onError, lineNumber, detail, context = null, range = null) {
  onError({ lineNumber, detail, context, range });
}

export function addErrorContext(onError, lineNumber, context, left = false, right = false, range = null) {
  if (context.length > 30) {
    if (left && right) {
      context = context.substr(0, 15) + "..." + context.substr(-15);
    } else if (right) {
      context = "..." + context.substr(-30);
    } else {
      context = context.substr(0, 30) + "...";
    }
  }
  addError(onError, lineNumber, null, context, range);
}

export function addErrorDetailIf(onError, lineNumber, expected, actual, detail = null, range = null) {
  if (expected !== actual) {
    const message = (expected ? `Expected: ${expected}; Actual: ` : '') + actual + (detail ? `; ${detail}` : '');
    addError(onError, lineNumber, message, null, range);
  }
}

export function addWarningContext(filename, linenumber, line, rule) {
  if (line.length > 30) {
    line = line.slice(0, 30) + "...";
  }
  if (line.length > 0) {
    line = ': ' + line;
  }
  console.warn(`[WARN] ${filename}: ${linenumber}: ${rule}${line}`);
}

export function filterTokens(params, type, callback) {
  const tokens = params.tokens || [];
  const isBase = (type.indexOf('_') === -1);

  // Most markdown-it tokens follow the _open/_close pattern (e.g., 'heading' -> 'heading_open', 'heading_close')
  // However, some token types don't follow this pattern (e.g., 'hr', 'html_block', 'code_block')
  // To handle both cases:
  // 1. If the type has an underscore (like 'blockquote_open'), use it as-is
  // 2. If the type is base (no underscore), check if it exists as-is in the token stream
  // 3. If not found as-is, append '_open' (for the common case)
  const hasExactType = isBase && tokens.some(token => token.type === type);
  const target = (isBase && !hasExactType) ? `${type}_open` : type;

  for (const token of tokens) {
    if (token.type === target) {
      callback(token);
    }
  }
}

export function forEachHeading(params, callback) {
  const tokens = params.tokens || [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading_open") {
      let text = "";
      const next = tokens[i + 1];
      if (next && next.type === "inline" && Array.isArray(next.children)) {
        for (const child of next.children) {
          if (child.type === "text" || child.type === "code_inline") {
            text += child.content;
          } else if (child.content) {
            text += child.content;
          }
        }
      }
      callback(token, text);
    }
  }
}

export function createCodeFenceState() {
  return {
    inCodeBlock: false,
    fenceChar: null,
    fenceCount: 0
  };
}

function stripBlockquotePrefix(line) {
  return line.replace(/^\s*(?:>\s*)*/, "");
}

export function updateCodeFenceState(line, state) {
  const nextState = { ...state };
  const normalized = stripBlockquotePrefix(line);
  const fenceMatch = normalized.match(/^([`~])\1{2,}/);

  if (!fenceMatch) {
    return nextState;
  }

  const fenceText = fenceMatch[0];
  const fenceChar = fenceText[0];
  const fenceCount = fenceText.length;
  const trailing = normalized.slice(fenceCount);

  if (!nextState.inCodeBlock) {
    nextState.inCodeBlock = true;
    nextState.fenceChar = fenceChar;
    nextState.fenceCount = fenceCount;
    return nextState;
  }

  if (
    fenceChar === nextState.fenceChar &&
    fenceCount >= nextState.fenceCount &&
    trailing.trim() === ""
  ) {
    nextState.inCodeBlock = false;
    nextState.fenceChar = null;
    nextState.fenceCount = 0;
  }

  return nextState;
}

export function forEachLine(params, callback) {
  const lines = params.lines || [];
  for (let i = 0; i < lines.length; i++) {
    callback(lines[i], i);
  }
}

export const codeBlockLanguages = [
  "bash", "sh", "shell", "zsh",
  "js", "ts", "javascript", "typescript",
  "json", "yaml", "yml", "html", "xml",
  "css", "scss", "less",
  "md", "markdown", "markup",
  "c", "cpp", "h", "hpp", "cs", "objectivec", "objc", "csharp",
  "java", "kotlin", "swift",
  "py", "python", "rb", "ruby", "go", "rs", "rust", "php",
  "sql", "plsql",
  "r", "jl", "matlab",
  "lua", "perl",
  "scala", "groovy",
  "powershell", "ps1",
  "dockerfile", "makefile", "cmake",
  "ini", "toml", "properties", "conf",
  "graphql", "graphql-schema",
  "text", "plaintext", "terminal", "console", "output",
  "diff", "patch", "git",
  "dotenv", "env",
];

/**
 * Parse frontmatter from markdown lines or content
 * @param {string[]|string} input - Markdown file lines array or content string
 * @returns {Object} Frontmatter parse result with { found, data, startLine, endLine, error, yamlLines }
 */
export function parseFrontmatter(input) {
  // Convert string to array of lines if needed
  const lines = Array.isArray(input) ? input : input.split('\n');

  let frontmatterStart = -1;
  let frontmatterEnd = -1;

  // Find frontmatter boundaries
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "---") {
      if (frontmatterStart === -1) {
        frontmatterStart = i;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    return { found: false, data: null, startLine: 0, endLine: 0 };
  }

  // Extract YAML content
  const yamlLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  const yamlContent = yamlLines.join("\n");

  try {
    const data = yaml.load(yamlContent);
    return {
      found: true,
      data: data,
      yamlContent: yamlContent,
      yamlLines: yamlLines,
      startLine: frontmatterStart + 2, // Line after opening ---
      endLine: frontmatterEnd + 1,
    };
  } catch (error) {
    return {
      found: true,
      data: null,
      error: error.message,
      yamlContent: yamlContent,
      yamlLines: yamlLines,
      startLine: frontmatterStart + 2, // Line after opening ---
      endLine: frontmatterEnd + 1,
    };
  }
}

/**
 * Check if a document is a landing page based on frontmatter and metadata hierarchy
 * @param {string} filePath - Full path to the markdown file
 * @param {Object} frontmatterData - Parsed frontmatter data
 * @param {Object} hierarchyResolver - Instance of MetadataHierarchyResolver (optional)
 * @returns {boolean} True if this is a landing page
 */
export function isLandingPage(filePath, frontmatterData, hierarchyResolver = null) {
  if (!frontmatterData) {
    return false;
  }

  // If hierarchy resolver is provided, use it to resolve metadata cascade
  if (hierarchyResolver) {
    const mergedMetadata = hierarchyResolver.resolveMetadata(filePath, frontmatterData);
    return mergedMetadata["landing-page"] === true;
  }

  // Otherwise, just check the frontmatter directly
  return frontmatterData["landing-page"] === true;
}