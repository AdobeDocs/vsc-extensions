// @ts-check
"use strict";

/**
 * AM047: Filename Conventions Validation
 *
 * Purpose: Validates markdown and asset file naming conventions for v2 compatibility.
 *          This rule validates file references in markdown links and images using token-based parsing.
 *
 * Validation Rules:
 * - Markdown files (.md): lowercase letters, numbers, and hyphens only
 *   Pattern: /^[a-z0-9]+(-[a-z0-9]+)*\.md$/
 *   Valid: admin-console.md, overview.md, getting-started-123.md
 *   Invalid: Admin-Console.md, admin_console.md, admin.console.md
 *
 * - Reserved markdown filenames are not allowed
 *   Invalid: actionable-insights.md, perspectives.md, new-page.md, test-page.md, index.md
 *
 * - Asset files (.png, .jpg, .gif, .svg, .webp, .bmp, .zip): any format except spaces
 *   Valid: Screenshot_2024.png, admin-Console.jpg
 *   Invalid: my screenshot.png, my archive.zip
 *
 * Special Cases (skipped):
 * - Files in _includes/ directory
 * - metadata.md and TOC.md (system files)
 * - Hidden files starting with dot
 * - External URLs (http://, https://, mailto:, etc.)
 * - Anchor links (#anchor)
 */

import { addError, forEachLine, createCodeFenceState, updateCodeFenceState } from "./custom-shared.mjs";

export const names = ["AM047", "filename-conventions"];
export const description =
  "Validates file naming conventions for markdown and asset file references";
export const tags = ["filenames", "naming", "links"];

// Regex to extract file paths from markdown links and images (fallback for edge cases)
// Matches: [text](path) and ![alt](path)
const LINK_PATTERN = /!?\[([^\]]*)\]\(([^)]+)\)/g;
const DISALLOWED_FILENAMES = new Set([
  "actionable-insights.md",
  "perspectives.md",
  "new-page.md",
  "test-page.md",
  "index.md"
]);

export function function_(params, onError) {
  const processedPaths = new Set(); // Track processed paths to avoid duplicates

  validateCurrentFileName(params.name, onError);

  // Primary approach: Use token-based parsing with fallbacks for different parser versions
  const tokens =
    params.parsers?.markdownit?.tokens ||
    params.tokens ||
    params.parsers?.micromark?.tokens ||
    [];

  // Find all inline tokens (which contain links and images)
  for (const token of tokens) {
    if (token.type === "inline" && token.children) {
      // Iterate through children to find link_open and image tokens
      for (const child of token.children) {
        // Check for link_open and image tokens
        if (child.type === "link_open" || child.type === "image") {
          const attrs = child.attrs || [];
          const hrefAttr = attrs.find(
            (attr) => attr[0] === "href" || attr[0] === "src"
          );

          if (hrefAttr && hrefAttr[1]) {
            const filePath = hrefAttr[1];
            const lineNumber = token.lineNumber || token.line || 1;

            // Track this path as processed
            const key = `${lineNumber}:${filePath}`;
            processedPaths.add(key);

            validateFilePath(filePath, lineNumber, onError);
          }
        }
      }
    }
  }

  // Fallback approach: Use regex to catch edge cases tokens might miss (e.g., files with spaces in title attributes)
  let codeFenceState = createCodeFenceState();

  forEachLine(params, function forLine(line, lineIndex) {
    const lineNumber = lineIndex + 1;

    // Track code blocks
    const prevInCodeBlock = codeFenceState.inCodeBlock;
    codeFenceState = updateCodeFenceState(line, codeFenceState);
    const inCode = codeFenceState.inCodeBlock;

    // Skip lines in code blocks
    if (inCode || prevInCodeBlock) {
      return;
    }

    // Find all links and images in the line using regex
    let match;
    LINK_PATTERN.lastIndex = 0;

    while ((match = LINK_PATTERN.exec(line)) !== null) {
      // Extract the part between parentheses
      let fullContent = match[2].trim();

      // Only strip title attributes (space followed by quote), not standalone spaces in filenames
      // Title attributes look like: "filename.md" Title" or 'filename.md' Title'
      const filePath = fullContent.replace(/\s+["'].*$/, '');

      // Check if we already processed this path via tokens
      const key = `${lineNumber}:${filePath}`;
      if (processedPaths.has(key)) {
        continue;
      }

      // Validate this path (found by regex but not by tokens)
      validateFilePath(filePath, lineNumber, onError);
    }
  });
}

function validateCurrentFileName(filePath, onError) {
  if (!filePath) {
    return;
  }

  const normalizedPath = String(filePath).replace(/\\/g, "/");
  const filename = normalizedPath.split("/").pop();
  if (!filename) {
    return;
  }

  if (normalizedPath.includes("/_includes/")) {
    return;
  }

  const lowerFilename = filename.toLowerCase();
  const specialMetadataFiles = new Set(["metadata.md", "toc.md"]);
  if (specialMetadataFiles.has(lowerFilename) || lowerFilename.startsWith(".")) {
    return;
  }

  if (lowerFilename.endsWith(".md")) {
    validateMarkdownFilename(filename, 1, onError);
  }
}

/**
 * Validates a file path from a link or image reference.
 */
function validateFilePath(filePath, lineNumber, onError) {
  // Skip external URLs
  if (isExternalUrl(filePath)) {
    return;
  }

  // Skip fragment-only links
  if (filePath.startsWith("#")) {
    return;
  }

  // Extract filename from path (remove anchors and query strings)
  const cleanPath = filePath.split("#")[0].split("?")[0];

  // Skip if path is empty after cleaning
  if (!cleanPath) {
    return;
  }

  // Extract just the filename from the path
  const filename = cleanPath.split("/").pop();

  if (!filename) {
    return;
  }

  // Skip if filename is in _includes directory
  if (cleanPath.includes("/_includes/")) {
    return;
  }

  // Skip special metadata files
  const specialMetadataFiles = ["metadata.md", "TOC.md"];
  if (specialMetadataFiles.includes(filename)) {
    return;
  }

  // Skip hidden files
  if (filename.startsWith(".")) {
    return;
  }

  // Validate based on file type
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.endsWith(".md")) {
    validateMarkdownFilename(filename, lineNumber, onError);
  } else {
    validateAssetFilename(filename, lineNumber, onError);
  }
}

/**
 * Checks if a path is an external URL.
 */
function isExternalUrl(path) {
  return /^(https?|ftp|mailto|tel):/i.test(path);
}

/**
 * Validates markdown filename conventions.
 * Markdown files must use lowercase-with-hyphens-only pattern.
 */
function validateMarkdownFilename(filename, lineNumber, onError) {
  if (DISALLOWED_FILENAMES.has(filename.toLowerCase())) {
    addError(onError, lineNumber, "Filename not allowed - Use a different filename.");
    return;
  }

  const validPattern = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;

  if (!validPattern.test(filename)) {
    let errorMessage = `Referenced file "${filename}" violates naming conventions. Markdown filename must be lowercase with hyphens only`;

    // Provide specific instructions based on the issue detected
    if (/[A-Z]/.test(filename)) {
      errorMessage +=
        ". Contains uppercase letters - use lowercase (e.g., 'admin-console.md')";
    } else if (/_/.test(filename)) {
      errorMessage +=
        ". Contains underscores - use hyphens instead (e.g., 'admin-console.md')";
    } else if (/\.(?!md$)/.test(filename)) {
      errorMessage +=
        ". Contains extra periods - use hyphens instead (e.g., 'admin-console-v1.md')";
    } else if (/\s/.test(filename)) {
      errorMessage +=
        ". Contains spaces - use hyphens instead (e.g., 'admin-console.md')";
    } else if (filename.startsWith("-") || filename.match(/^[a-z0-9]+-\.md$/)) {
      errorMessage +=
        ". Invalid hyphen placement - use hyphens between words only (e.g., 'admin-console.md')";
    } else if (/--/.test(filename)) {
      errorMessage +=
        ". Contains double hyphens - use single hyphens (e.g., 'admin-console.md')";
    }

    addError(onError, lineNumber, errorMessage);
  }
}

/**
 * Validates asset filename conventions.
 * Assets can use flexible naming but must not contain spaces.
 */
function validateAssetFilename(filename, lineNumber, onError) {
  if (/\s/.test(filename)) {
    addError(
      onError,
      lineNumber,
      `Referenced asset "${filename}" contains spaces. Remove spaces or use underscores/hyphens (e.g., 'screenshot_2024.png' or 'screenshot-2024.png')`
    );
  }
}

export default {
  names,
  description,
  tags,
  function: function_,
};
