// @ts-check

"use strict";

import path from "path";
import * as shared from "./custom-shared.mjs";

export const names = ["AM049", "toc-validation"];
export const description = "Table of Contents (TOC.md) validation";
export const tags = ["toc", "table-of-contents"];

/**
 * Check if this is a TOC.md file or a test file for TOC validation
 */
function isTOCFile(filename) {
  if (!filename) return false;
  const base = path.basename(filename.replace(/\\/g, "/"));
  return (
    base.endsWith("TOC.md") ||
    base.endsWith("TOC.MD") ||
    base.includes("test-am049-")
  );
}

/**
 * Validate YAML frontmatter has required fields
 */
function validateFrontmatter(params, onError) {
  // Combine frontmatter lines with content lines for parsing
  let lines = params.lines;
  if (params.frontMatterLines && params.frontMatterLines.length > 0) {
    lines = [...params.frontMatterLines, ...params.lines];
  }

  const frontmatter = shared.parseFrontmatter(lines);

  if (!frontmatter.found) {
    shared.addError(onError, 1, 'TOC.md must have YAML frontmatter', null, null);
    return false;
  }

  if (frontmatter.error) {
    shared.addError(onError, frontmatter.startLine, `Invalid YAML syntax: ${frontmatter.error}`, null, null);
    return false;
  }

  // Check for common required fields
  const requiredFields = ['user-guide-title'];
  const recommendedFields = ['breadcrumb-title', 'user-guide-description'];

  for (const field of requiredFields) {
    if (!frontmatter.data[field]) {
      shared.addError(onError, frontmatter.startLine, `Missing required frontmatter field: ${field}`, null, null);
    }
  }

  for (const field of recommendedFields) {
    if (!frontmatter.data[field]) {
      // Just a warning - we won't fail the test for this
      shared.addWarningContext(params.name, frontmatter.startLine, '', `Missing recommended frontmatter field: ${field}`);
    }
  }

  return true;
}

/**
 * Validate main heading has required identifier
 * Note: Multiple H1 check is handled by MD025 (single-title/single-h1)
 */
function validateMainHeading(params, onError) {
  let h1Found = false;
  let h1Line = -1;
  let hasIdentifier = false;

  shared.forEachLine(params, (line, lineIndex) => {
    const trimmed = line.trim();

    // Check for H1 heading (only check the first one found)
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ') && !h1Found) {
      h1Found = true;
      h1Line = lineIndex + 1;

      // Check for section identifier {#identifier}
      const identifierMatch = trimmed.match(/\{#([a-z0-9-]+)\}/);
      if (identifierMatch) {
        hasIdentifier = true;
        const identifier = identifierMatch[1];

        // Validate identifier format (lowercase, numbers, hyphens only)
        if (!/^[a-z0-9-]+$/.test(identifier)) {
          shared.addError(onError, lineIndex + 1,
            `Section identifier must only contain lowercase letters, numbers, and hyphens: {#${identifier}}`,
            line.trim(), null);
        }
      } else {
        // H1 found but no identifier
        shared.addError(onError, lineIndex + 1, 'Main heading must include section identifier like {#using}', null, null);
      }
    }
  });

  if (!h1Found) {
    shared.addError(onError, 1, 'TOC.md must have at least one H1 heading with section identifier', null, null);
  }
}

/**
 * Strip optional leading directive ({hide-from-toc}, {.hide-from-toc})
 * from TOC list item content for pattern matching. Must match KNOWN_DIRECTIVES in am053.mjs.
 */
function stripLeadingDirective(content) {
  return content.replace(/^\s*\{\.?hide-from-toc\}\s*/, "");
}

/**
 * Validate list items and links
 */
function validateListItems(params, onError) {
  let inFrontmatter = false;
  let frontmatterEnded = false;
  const fileReferences = new Set();
  // Track identifiers by indent level to allow duplicates in different branches
  // Structure: Map<indentLevel, Set<identifier>>
  const identifiersByLevel = new Map();

  shared.forEachLine(params, (line, lineIndex) => {
    const trimmed = line.trim();

    // Track frontmatter boundaries
    if (trimmed === '---') {
      if (!inFrontmatter && !frontmatterEnded) {
        inFrontmatter = true;
        return;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        frontmatterEnded = true;
        return;
      }
    }

    if (inFrontmatter) return;

    // Check for list items (+ or - markers)
    const listMatch = line.match(/^(\s*)([\+\-\*])\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1];
      const content = listMatch[3];

      // Note: Indentation consistency is handled by MD007 (ul-indent) if enabled
      // TOC files may use 2, 3, or 4 space increments depending on repository standards

      // Check for markdown link format (trim content to handle trailing whitespace)
      const trimmedContent = content.trim();
      // Strip leading directive ({hide-from-toc}, {.hide-from-toc}) before matching
      const contentForMatch = stripLeadingDirective(trimmedContent);
      // Match links with possible nested brackets for AFM tags like [!DNL ...], [!UICONTROL ...]
      // Pattern: [ ... any content including [!TAG ...] ... ](url) with optional attributes like {target=_blank}
      const linkMatch = contentForMatch.match(/^\[(.+)\]\(([^)]+)\)(?:\{[^}]+\})?$/);
      const sectionMatch = contentForMatch.match(/^([^{]+)\s*\{#([a-z0-9-]+)\}$/);

      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkPath = linkMatch[2];

        // Check for empty link text
        if (!linkText || linkText.trim() === '') {
          shared.addError(onError, lineIndex + 1,
            'Link text cannot be empty',
            line.trim(), null);
        }

        // Check file extension (allow external URLs)
        const isExternalUrl = /^https?:\/\//i.test(linkPath);
        if (!isExternalUrl && !linkPath.endsWith('.md')) {
          shared.addError(onError, lineIndex + 1,
            'TOC links must reference .md files or external URLs',
            line.trim(), null);
        }

        // Check for duplicate file references (only for local files)
        if (!isExternalUrl) {
          if (fileReferences.has(linkPath)) {
            shared.addError(onError, lineIndex + 1,
              `Duplicate file reference: ${linkPath}`,
              line.trim(), null);
          } else {
            fileReferences.add(linkPath);
          }
        }

        // Optionally check if file exists (can be expensive, so make it optional)
        // const fullPath = resolve(baseDir, linkPath);
        // if (!existsSync(fullPath)) {
        //   shared.addError(onError, lineIndex + 1,
        //     `Referenced file does not exist: ${linkPath}`,
        //     line.trim(), null);
        // }

      } else if (sectionMatch) {
        // Section header with identifier
        const sectionName = sectionMatch[1].trim();
        const identifier = sectionMatch[2];

        if (!sectionName) {
          shared.addError(onError, lineIndex + 1,
            'Section name cannot be empty',
            line.trim(), null);
        }

        // Validate identifier format
        if (!/^[a-z0-9-]+$/.test(identifier)) {
          shared.addError(onError, lineIndex + 1,
            `Section identifier must only contain lowercase letters, numbers, and hyphens: {#${identifier}}`,
            line.trim(), null);
        }

        const indentLevel = indent.length;
        if (!identifiersByLevel.has(indentLevel)) {
          identifiersByLevel.set(indentLevel, new Set());
        }

        // Clear identifiers from deeper levels when we encounter a new section
        // (moving back up the tree invalidates child identifiers)
        for (const [level, _] of identifiersByLevel) {
          if (level > indentLevel) {
            identifiersByLevel.delete(level);
          }
        }

      } else if (trimmedContent !== '') {
        // List item that's not a link or section - should be one of those
        shared.addError(onError, lineIndex + 1,
          'TOC list items must be either markdown links [Text](path.md) or section headers with identifiers {#id}',
          line.trim(), null);
      }
    }

    // Check for section headers that aren't list items
    if (!listMatch && trimmed.match(/\{#[a-z0-9-]+\}/)) {
      // This might be okay if it's on the H1
      if (!trimmed.startsWith('# ')) {
        shared.addError(onError, lineIndex + 1,
          'Section identifiers should be on list items or the main heading',
          line.trim(), null);
      }
    }
  });
}

// Note: List marker consistency is handled by MD004 (ul-style)

/**
 * Check for forbidden content types in TOC files
 * TOC should only contain: frontmatter, H1 heading, and lists
 */
function checkForbiddenContent(params, onError) {
  let inFrontmatter = false;
  let frontmatterEnded = false;
  let frontmatterEndLine = -1;
  let inCodeBlock = false;

  shared.forEachLine(params, (line, lineIndex) => {
    const trimmed = line.trim();

    // Track frontmatter
    if (trimmed === '---') {
      if (!inFrontmatter && !frontmatterEnded) {
        inFrontmatter = true;
        return;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        frontmatterEnded = true;
        frontmatterEndLine = lineIndex;
        return;
      }
    }

    if (inFrontmatter) return;

    // Track code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      shared.addError(onError, lineIndex + 1,
        'TOC files should not contain code blocks',
        line.trim(), null);
      return;
    }

    if (inCodeBlock) return;

    // Check for images
    if (trimmed.match(/!\[.*?\]\(.*?\)/)) {
      shared.addError(onError, lineIndex + 1,
        'TOC files should not contain images',
        line.trim(), null);
    }

    // Check for tables
    if (trimmed.match(/^\|.*\|$/)) {
      shared.addError(onError, lineIndex + 1,
        'TOC files should not contain tables',
        line.trim(), null);
    }

    // Check for blockquotes/admonitions
    if (trimmed.startsWith('>')) {
      shared.addError(onError, lineIndex + 1,
        'TOC files should not contain blockquotes or admonitions',
        line.trim(), null);
    }

    // Check for horizontal rules (but not the frontmatter closing delimiter)
    if (trimmed.match(/^(---|\*\*\*|___)$/) && lineIndex !== frontmatterEndLine) {
      shared.addError(onError, lineIndex + 1,
        'TOC files should not contain horizontal rules',
        line.trim(), null);
    }

    // Check for HTML blocks (simple check for opening tags)
    if (trimmed.match(/^<[a-z][\s\S]*?>/i) && !trimmed.startsWith('<!--')) {
      shared.addError(onError, lineIndex + 1,
        'TOC files should not contain HTML blocks',
        line.trim(), null);
    }
  });
}

/**
 * Check for orphaned sections (sections without children) and links with children
 */
function checkOrphanedSections(params, onError) {
  let inFrontmatter = false;
  let frontmatterEnded = false;
  let previousWasSection = false;
  let previousSectionLine = -1;
  let previousIndent = -1;
  let previousWasLink = false;
  let previousLinkLine = -1;
  let previousLinkIndent = -1;

  shared.forEachLine(params, (line, lineIndex) => {
    const trimmed = line.trim();

    // Track frontmatter
    if (trimmed === '---') {
      if (!inFrontmatter && !frontmatterEnded) {
        inFrontmatter = true;
        return;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        frontmatterEnded = true;
        return;
      }
    }

    if (inFrontmatter) return;

    const listMatch = line.match(/^(\s*)([\+\-\*])\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const content = listMatch[3];
      const contentForMatch = stripLeadingDirective(content.trim());
      const isSection = contentForMatch.match(/\{#[a-z0-9-]+\}$/);
      const isLink = contentForMatch.match(/^\[([^\]]*)\]\(([^)]+)\)$/);

      // If previous was a section and current is not indented more, it's orphaned
      if (previousWasSection && indent <= previousIndent) {
        shared.addError(onError, previousSectionLine,
          'Section header should have at least one child item',
          null, null);
      }

      // If previous was a link and current is indented more, link has children (invalid)
      if (previousWasLink && indent > previousLinkIndent) {
        shared.addError(onError, previousLinkLine,
          'Parent items with children must be section headers {#id}, not links',
          null, null);
      }

      // Reset link tracking if we're at same or lower indent
      if (previousWasLink && indent <= previousLinkIndent) {
        previousWasLink = false;
      }

      previousWasSection = isSection !== null;
      if (previousWasSection) {
        previousSectionLine = lineIndex + 1;
        previousIndent = indent;
      }

      // Track if current item is a link (for next iteration)
      if (isLink && !isSection) {
        previousWasLink = true;
        previousLinkLine = lineIndex + 1;
        previousLinkIndent = indent;
      }
    } else if (trimmed === '' || trimmed.startsWith('#')) {
      // Empty line or heading - reset check
      if (previousWasSection) {
        shared.addError(onError, previousSectionLine,
          'Section header should have at least one child item',
          null, null);
      }
      previousWasSection = false;
      previousWasLink = false;
    }
  });

  // Check if the last item was an orphaned section
  if (previousWasSection) {
    shared.addError(onError, previousSectionLine,
      'Section header should have at least one child item',
      null, null);
  }
}

export function function_(params, onError) {
  // Only run on TOC.md files
  if (!isTOCFile(params.name)) {
    return;
  }

  // Run all validations
  const hasFrontmatter = validateFrontmatter(params, onError);

  // Only continue with other checks if frontmatter is valid
  if (hasFrontmatter) {
    validateMainHeading(params, onError);
    checkForbiddenContent(params, onError);
    validateListItems(params, onError);
    checkOrphanedSections(params, onError);
  }
}

export default {
  names,
  description,
  tags,
  function: function_,
};

