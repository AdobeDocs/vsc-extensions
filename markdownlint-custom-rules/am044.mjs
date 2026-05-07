// @ts-check

"use strict";

import {
  forEachLine,
  addErrorContext,
  addError,
  createCodeFenceState,
  updateCodeFenceState,
} from "./custom-shared.mjs";
import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve, relative, isAbsolute } from "path";

export const names = ["AM044", "includes-snippets"];
export const description = "Validates include and snippet syntax in markdown files";
export const tags = ["includes", "snippets"];

/**
 * Validates that a resolved path is within the project root (path traversal protection)
 * @param {string} resolvedPath - The fully resolved path to validate
 * @param {string} projectRoot - The project root directory
 * @returns {boolean} True if path is safe (within project), false if path traversal detected
 */
function isPathWithinProject(resolvedPath, projectRoot) {
  // Get the relative path from project root to the resolved path
  const relativePath = relative(projectRoot, resolvedPath);

  // Path is safe if:
  // 1. Relative path doesn't start with '..' (not outside project)
  // 2. Relative path is not absolute (on Windows, different drive)
  return !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

// Helper function to replace code spans with placeholders and track their positions
function replaceCodeSpans(line) {
  const codeSpans = [];

  // Preprocess: replace all escaped backticks (\`) with a unique placeholder
  const ESCAPED_BACKTICK_PLACEHOLDER = "__ESCAPED_BACKTICK__";
  const preprocessedLine = line.replace(/\\`/g, ESCAPED_BACKTICK_PLACEHOLDER);

  // Regex to match code spans (one or more backticks, content, matching backticks)
  // No lookbehind; escaped backticks are already replaced
  const codeSpanRegex = /`+(?:[^`]|__ESCAPED_BACKTICK__)*?`+/g;

  // First, collect all matches from the original line
  const matches = [...preprocessedLine.matchAll(codeSpanRegex)];

  // Then process them in reverse order to avoid offset issues
  let processedLine = preprocessedLine;
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const placeholder = `__CODE_SPAN_${i}__`;
    // Restore escaped backticks in the matched content
    const originalContent = match[0].replace(new RegExp(ESCAPED_BACKTICK_PLACEHOLDER, "g"), "\\`");
    codeSpans.unshift({
      start: match.index,
      end: match.index + match[0].length - 1,
      content: originalContent
    });

    // Replace in processed line (processing in reverse avoids offset issues)
    processedLine = processedLine.substring(0, match.index) +
                    placeholder +
                    processedLine.substring(match.index + match[0].length);
  }

  // Restore escaped backticks in the final processed line
  processedLine = processedLine.replace(new RegExp(ESCAPED_BACKTICK_PLACEHOLDER, "g"), "\\`");

  return { processedLine, codeSpans };
}

// Proper caching class for snippets
class SnippetsCache {
  constructor() {
    this.cache = new Map();
  }

  getSnippets(snippetsPath) {
    if (this.cache.has(snippetsPath)) {
      return this.cache.get(snippetsPath);
    }

    try {
      if (!existsSync(snippetsPath)) {
        // Snippets file not found; returning empty set
        return new Set();
      }

      const content = readFileSync(snippetsPath, 'utf8');
      const snippets = this.parseSnippets(content);
      this.cache.set(snippetsPath, snippets);
      return snippets;
    } catch (error) {
      // Could not read snippets file; returning empty set
      return new Set();
    }
  }

  parseSnippets(content) {
    const snippets = new Set();
    const matches = content.matchAll(/^##\s+.*?\{#([A-Za-z0-9\-]+)\}/gm);
    for (const match of matches) {
      snippets.add(match[1]);
    }
    return snippets;
  }

  clear() {
    this.cache.clear();
  }
}

// Global cache instance
const snippetsCache = new SnippetsCache();

// Helper function to resolve include paths safely
function resolveIncludePath(currentFilePath, includePath) {
  // Validate include path format first
  if (!includePath.startsWith('/help/_includes/') || !includePath.endsWith('.md')) {
    return null;
  }

  try {
    // Find project root by looking for known markers
    let currentDir = dirname(currentFilePath);
    let projectRoot = currentDir;

    // Walk up to find project root
    while (currentDir !== dirname(currentDir)) {
      if (existsSync(join(currentDir, 'package.json')) ||
          existsSync(join(currentDir, '.git')) ||
          existsSync(join(currentDir, 'markdownlint.json'))) {
        projectRoot = currentDir;
        break;
      }
      currentDir = dirname(currentDir);
    }

    // Try the standard path first
    let fullPath = resolve(projectRoot, includePath.substring(1));

    // Security check: ensure resolved standard path is within project
    if (!isPathWithinProject(fullPath, projectRoot)) {
      throw new Error('Path traversal detected in include path');
    }

    // If not found and we're in a test context, try test/help path
    // Only allow test fallback when linting files in the test directory
    // to avoid masking genuine missing include errors in production
    const isTestContext = currentFilePath.includes('/test/');

    if (!existsSync(fullPath) && isTestContext) {
      const testPath = resolve(projectRoot, 'test', includePath.substring(1));

      // Security check: ensure test path is also within project
      if (!isPathWithinProject(testPath, projectRoot)) {
        throw new Error('Path traversal detected in test include path');
      }

      if (existsSync(testPath)) {
        fullPath = testPath;
      }
    }

    return fullPath;
  } catch (error) {
    // Could not resolve include path; returning null
    return null;
  }
}

function getDefinedSnippets(currentFilePath) {
  try {
    // Find the snippets.md file relative to the current file
    const pathParts = currentFilePath.replace(/\\/g, '/').split('/');
    const helpIndex = pathParts.findIndex(part => part === 'help');

    if (helpIndex === -1) {
      return new Set(); // No help directory found
    }

    const snippetsPath = pathParts.slice(0, helpIndex + 1).concat(['_includes', 'snippets.md']).join('/');
    return snippetsCache.getSnippets(snippetsPath);
  } catch (error) {
    // Error getting snippets; returning empty set
    return new Set();
  }
}

// Helper function to add errors with better context
function addErrorWithContext(onError, lineNumber, message, line, match) {
  const range = match ? [match.index + 1, match[0].length] : null;
  const context = match ? match[0] : null;
  addError(onError, lineNumber, message, context, range);
}

// Regexes for HTML code block detection (moved outside function for performance)
const openTagRegex = /<(pre|code)(?:\s[^>]*)?>/gi;
const closeTagRegex = /<\/(pre|code)>/gi;
// More robust single-line regex that handles nested HTML tags within code blocks
const singleLineRegex = /<(pre|code)(?:\s[^>]*)?>((?:(?!<\/\1>).)*)<\/\1>/gi;

// Helper function to detect HTML code blocks more accurately
function updateHtmlCodeBlockState(line, currentState) {
  // Reset regex state to avoid stale state issues
  singleLineRegex.lastIndex = 0;
  openTagRegex.lastIndex = 0;
  closeTagRegex.lastIndex = 0;

  // Check for single-line HTML code blocks first
  if (singleLineRegex.test(line)) {
    return { inHtmlCodeBlock: currentState, isSingleLineHtmlCodeBlock: true };
  }

  let newState = currentState;

  // Count opening and closing tags
  const openMatches = [...line.matchAll(openTagRegex)];
  const closeMatches = [...line.matchAll(closeTagRegex)];

  // Reset regex state after using matchAll
  openTagRegex.lastIndex = 0;
  closeTagRegex.lastIndex = 0;

  // Filter out self-contained tags from open matches
  const actualOpenMatches = openMatches.filter(openMatch => {
    // Check if this opening tag has a corresponding closing tag on the same line
    const tagName = openMatch[1];
    const closeRegexForTag = new RegExp(`<\\/${tagName}>`, 'gi');
    const restOfLine = line.substring(openMatch.index + openMatch[0].length);
    return !closeRegexForTag.test(restOfLine);
  });

  if (actualOpenMatches.length > 0 && closeMatches.length === 0) {
    newState = true;
  } else if (closeMatches.length > 0 && actualOpenMatches.length === 0) {
    newState = false;
  }

  return { inHtmlCodeBlock: newState, isSingleLineHtmlCodeBlock: false };
}

// Helper function to process all patterns in a single pass
function processLinePatterns(processedLine) {
  const patterns = {
    include: /\{\{\$include\s+([^}]+)\}\}/g,
    snippet: /\{\{([A-Za-z0-9\-]+)\}\}/g,
    malformed: /\{\{[^}]*\}\}/g
  };

  const results = {};
  for (const [key, regex] of Object.entries(patterns)) {
    results[key] = [...processedLine.matchAll(regex)];
    regex.lastIndex = 0; // Reset regex state
  }

  return results;
}

// Helper function to find unescaped braces that are not part of valid syntax
function findUnescapedBraces(processedLine, validMatches) {
  const unescapedBraces = [];

  // Create a set of valid ranges to exclude
  const validRanges = new Set();
  for (const matchArray of Object.values(validMatches)) {
    for (const match of matchArray) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        validRanges.add(i);
      }
    }
  }

  // Look for standalone {{ or }} that are not part of valid syntax
  const braceRegex = /\{\{|\}\}/g;
  let match;

  while ((match = braceRegex.exec(processedLine)) !== null) {
    // Check if this brace is part of a valid match
    let isPartOfValid = false;
    for (let i = match.index; i < match.index + match[0].length; i++) {
      if (validRanges.has(i)) {
        isPartOfValid = true;
        break;
      }
    }

    if (!isPartOfValid) {
      unescapedBraces.push(match);
    }
  }

  return unescapedBraces;
}

export function function_(params, onError) {
  const filename = params.name || "";
  let codeFenceState = createCodeFenceState();
  let inHtmlCodeBlock = false;

  // Skip validation for the snippets.md file specifically (handled by AM042)
  // But allow validation for other include files that may contain snippet references
  if (filename.replace(/\\/g, '/').endsWith('help/_includes/snippets.md')) {
    return;
  }

  // Get defined snippets for existence validation
  const definedSnippets = getDefinedSnippets(filename);

  forEachLine(params, function (line, lineIndex) {
    const lineNumber = lineIndex + 1;
    const prevInCodeBlock = codeFenceState.inCodeBlock;
    codeFenceState = updateCodeFenceState(line, codeFenceState);
    const incode = codeFenceState.inCodeBlock;

    // Update HTML code block state using improved detection
    const htmlState = updateHtmlCodeBlockState(line, inHtmlCodeBlock);
    inHtmlCodeBlock = htmlState.inHtmlCodeBlock;
    const isSingleLineHtmlCodeBlock = htmlState.isSingleLineHtmlCodeBlock;

    // Skip code blocks (markdown and HTML) and comments
    if (incode || prevInCodeBlock || inHtmlCodeBlock || isSingleLineHtmlCodeBlock || line.trim().startsWith("<!--")) {
      return;
    }

    // Pre-process line to temporarily replace code spans with placeholders
    // This prevents regex from matching across code span boundaries
    const { processedLine, codeSpans } = replaceCodeSpans(line);

    // Process all patterns in a single pass for efficiency
    const matches = processLinePatterns(processedLine);

    // Check for include syntax: {{$include /path/to/file.md}}
    for (const match of matches.include) {
      const includePath = match[1].trim();

      // Validate include path format
      if (!includePath.startsWith('/help/_includes/')) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Include path should start with '/help/_includes/', found: ${includePath}`,
          line,
          match
        );
        continue;
      }

      if (!includePath.endsWith('.md')) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Include path should end with '.md', found: ${includePath}`,
          line,
          match
        );
        continue;
      }

      // Check for invalid characters (spaces, special chars)
      if (!/^\/help\/_includes\/[A-Za-z0-9\/_-]+\.md$/.test(includePath)) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Include path contains invalid characters. Use only letters, numbers, hyphens, underscores, and forward slashes: ${includePath}`,
          line,
          match
        );
        continue;
      }

      // Check if the included file actually exists using improved path resolution
      const resolvedPath = resolveIncludePath(filename, includePath);
      if (resolvedPath && !existsSync(resolvedPath)) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Include file does not exist: ${includePath}`,
          line,
          match
        );
      } else if (!resolvedPath) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Cannot resolve include path: ${includePath}`,
          line,
          match
        );
      }
    }

    // Check for snippet syntax: {{snippet-tag}} (but not includes or metadata)
    for (const match of matches.snippet) {
      const snippetTag = match[1];

      // Skip metadata tags (starting with __meta_)
      if (snippetTag.startsWith("__meta_")) {
        continue;
      }

      // Validate snippet tag format (already matched by regex, but double-check for clarity)
      if (!snippetTag.match(/^[A-Za-z0-9\-]+$/)) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Snippet tag contains invalid characters. Use only letters, numbers, and hyphens: {{${snippetTag}}}`,
          line,
          match
        );
        continue;
      }

      // Check if snippet exists in snippets.md
      if (definedSnippets.size > 0 &&
          !definedSnippets.has(snippetTag)) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Unknown snippet "{{${snippetTag}}}" - not defined in snippets.md file`,
          line,
          match
        );
      }
    }

    // Check for malformed include/snippet syntax
    for (const match of matches.malformed) {
      const content = match[0];

      // Skip valid includes (already processed)
      if (matches.include.some(includeMatch => includeMatch[0] === content)) {
        continue;
      }

      // Skip valid snippets (already processed)
      if (matches.snippet.some(snippetMatch => snippetMatch[0] === content)) {
        continue;
      }

      // Skip metadata references
      if (content.match(/\{\{__meta_[^}]+\}\}/)) {
        continue;
      }

      // If we get here, it's likely malformed
      if (content.includes('$include')) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Malformed include syntax. Expected format: {{$include /help/_includes/filename.md}}, found: ${content}`,
          line,
          match
        );
      } else {
        addErrorWithContext(
          onError,
          lineNumber,
          `Invalid snippet/include syntax. Use {{snippet-tag}} for snippets or {{$include /path}} for includes, found: ${content}`,
          line,
          match
        );
      }
    }

    // Check for unescaped curly braces that might be intended as literal text
    // Skip this check for documentation about includes/snippets
    if (!line.includes('`{{') && // Skip curly braces inside inline code
        !line.includes('}}`')) {
      const unescapedBraces = findUnescapedBraces(processedLine, matches);
      for (const match of unescapedBraces) {
        addErrorWithContext(
          onError,
          lineNumber,
          `Unescaped curly braces found. If you want to display {{ or }} as literal text, escape them with backslashes: \\{\\{ or \\}\\}`,
          line,
          match
        );
      }
    }
  });
}

export default {
  names,
  description,
  tags,
  function: function_,
};
