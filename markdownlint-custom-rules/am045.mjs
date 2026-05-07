// @ts-check
"use strict";

import { filterTokens, addError, forEachLine, parseFrontmatter, isLandingPage } from "./custom-shared.mjs";
import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import MetadataHierarchyResolver from "./metadata-hierarchy-resolver.mjs";

export const names = ["AM045", "landing-page-validation"];
export const description = "Landing page validation";
export const tags = ["frontmatter", "landing-pages"];

// Initialize the hierarchy resolver
const hierarchyResolver = new MetadataHierarchyResolver();

/**
 * Check for banned tokens in markdown content
 * Uses regex fallback when micromark tokens not available
 * @param {any} params - Rule parameters
 * @param {any} options - Rule configuration options
 * @param {Function} onError - Error callback
 */
function checkBannedTokens(params, options, onError) {
  const bannedTokens = options.bannedTokens || [];

  for (const tokenType of bannedTokens) {
    // Try token-based filtering first
    let tokenCount = 0;
    filterTokens(params, tokenType, (token) => {
      tokenCount++;
      const lineNumber = token.startLine || 1;
      addError(
        onError,
        lineNumber,
        `Landing pages must not include ${tokenType}`,
        null,
        null
      );
    });

    // If no tokens found, use regex fallback for common types
    if (tokenCount === 0) {
      if (tokenType === "image") {
        checkImagesWithRegex(params, onError);
      } else if (tokenType === "table") {
        checkTablesWithRegex(params, onError);
      } else if (tokenType === "htmlFlow" || tokenType === "html_block") {
        checkHtmlWithRegex(params, onError);
      }
    }
  }
}

/**
 * Check for tables using regex pattern (fallback)
 * @param {any} params - Rule parameters
 * @param {Function} onError - Error callback
 */
function checkTablesWithRegex(params, onError) {
  const tableRegex = /^\|.*\|$/;
  forEachLine(
    params,
    (/** @type {any} */ line, /** @type {any} */ lineIndex) => {
      if (tableRegex.test(line.trim())) {
        addError(
          onError,
          lineIndex + 1,
          "Landing pages must not include table",
          line.trim().substring(0, 30) + (line.trim().length > 30 ? "..." : ""),
          null
        );
      }
    }
  );
}

/**
 * Check for HTML using regex pattern (fallback)
 * @param {any} params - Rule parameters
 * @param {Function} onError - Error callback
 */
function checkHtmlWithRegex(params, onError) {
  const htmlRegex = /<[a-z][\s\S]*?>/i;
  forEachLine(
    params,
    (/** @type {any} */ line, /** @type {any} */ lineIndex) => {
      if (htmlRegex.test(line)) {
        addError(
          onError,
          lineIndex + 1,
          "Landing pages must not include htmlFlow",
          line.trim().substring(0, 30) + (line.trim().length > 30 ? "..." : ""),
          null
        );
      }
    }
  );
}

/**
 * Check for images using regex pattern (fallback)
 * @param {any} params - Rule parameters
 * @param {Function} onError - Error callback
 */
function checkImagesWithRegex(params, onError) {
  const imageRegex = /!\[.*?\]\(.*?\)/g;
  forEachLine(
    params,
    (/** @type {any} */ line, /** @type {any} */ lineIndex) => {
      let match;
      while ((match = imageRegex.exec(line)) !== null) {
        addError(
          onError,
          lineIndex + 1,
          "Landing pages must not include image",
          match[0],
          [match.index + 1, match[0].length]
        );
      }
    }
  );
}

/**
 * Validate child-repos field (optional field)
 * If present, must be valid; if absent, no error is raised
 * @param {any} frontmatter - Parsed frontmatter
 * @param {any} options - Rule configuration options
 * @param {Function} onError - Error callback
 * @param {number} lineNumber - Frontmatter start line
 */
function validateChildRepos(frontmatter, options, onError, lineNumber) {
  const fieldName = "child-repos";

  // Field is optional - if not present in frontmatter, skip validation
  if (!(fieldName in frontmatter.data)) {
    return;
  }

  let repos = frontmatter.data[fieldName];

  // Field exists but is null or empty - this is an error
  if (!repos || repos === null) {
    addError(
      onError,
      lineNumber,
      "Frontmatter 'child-repos' field is present but empty. Either provide values or remove the field.",
      null,
      null
    );
    return;
  }

  // Support both YAML array and comma-separated string
  if (typeof repos === "string") {
    repos = repos
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  }

  // If present, it must be non-empty after processing
  if (!Array.isArray(repos) || repos.length === 0) {
    addError(
      onError,
      lineNumber,
      "Frontmatter 'child-repos' field is present but empty. Either provide values or remove the field.",
      null,
      null
    );
    return;
  }

  // Optional pattern validation
  if (options.childReposPattern) {
    const pattern = new RegExp(options.childReposPattern);
    for (const repo of repos) {
      if (!pattern.test(repo)) {
        addError(
          onError,
          lineNumber,
          `Child repo '${repo}' does not match required pattern: ${options.childReposPattern}`,
          null,
          null
        );
      }
    }
  }
}

/**
 * Validate parent-landing-page field
 * Field is optional, but if present, must have a non-null value
 * @param {any} frontmatter - Parsed frontmatter
 * @param {Function} onError - Error callback
 * @param {number} lineNumber - Frontmatter start line
 */
function validateParentLandingPage(frontmatter, onError, lineNumber) {
  const fieldName = "parent-landing-page";

  // Check if the field exists in the frontmatter
  if (fieldName in frontmatter.data) {
    const value = frontmatter.data[fieldName];

    // Field exists but is null, undefined, or empty string
    if (value === null || value === undefined || value === "") {
      addError(
        onError,
        lineNumber,
        `Frontmatter '${fieldName}' field is present but has no value. Either provide a value or remove the field.`,
        null,
        null
      );
    }
  }
}

/**
 * Main rule function
 * @param {any} params - Rule parameters
 * @param {Function} onError - Error callback
 */
export function function_(params, onError) {
  // Get configuration (simplified - only bannedTokens and childReposPattern)
  const options = params.config || {};

  // Extract frontmatter lines
  let lines = params.lines;
  if (params.frontMatterLines && params.frontMatterLines.length > 0) {
    // Combine frontmatter lines with content lines
    lines = [...params.frontMatterLines, ...params.lines];
  } else if (lines.length > 0 && !lines[0].trim().startsWith("---")) {
    // Frontmatter was stripped, try reading file directly
    try {
      const fileContent = readFileSync(params.name, "utf8");
      lines = fileContent.split("\n");
    } catch (error) {
      // If file read fails, continue with params.lines
    }
  }

  // Parse frontmatter
  const frontmatter = parseFrontmatter(lines);

  // Skip if no frontmatter found
  if (!frontmatter.found || !frontmatter.data) {
    return; // Not a landing page - skip all validation
  }

  // Check if this is a landing page using shared utility
  if (!isLandingPage(params.name, frontmatter.data, hierarchyResolver)) {
    return; // Not a landing page - skip all validation
  }

  // Frontmatter parse error handling
  if (frontmatter.error) {
    addError(
      onError,
      frontmatter.startLine,
      `Invalid YAML syntax: ${frontmatter.error}`,
      null,
      null
    );
    return;
  }

  // Token blacklist validation (landing-page-specific)
  checkBannedTokens(params, options, onError);

  // child-repos validation (landing-page-specific)
  validateChildRepos(frontmatter, options, onError, frontmatter.startLine);

  // parent-landing-page validation (landing-page-specific)
  validateParentLandingPage(frontmatter, onError, frontmatter.startLine);
}

export default {
  names,
  description,
  tags,
  function: function_,
};
