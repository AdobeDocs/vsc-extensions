// @ts-check

"use strict";

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve, relative } from 'path';
import { parseFrontmatter } from './custom-shared.mjs';
import config from './frontmatter-config.mjs';

/**
 * Resolves metadata hierarchy by walking up directory tree to find:
 * 1. metadata.md in repo root
 * 2. TOC.md files in parent directories
 * 3. article frontmatter
 *
 * Values cascade down: metadata.md -> TOC.md -> article.md
 * More specific values override more general ones.
 */
class MetadataHierarchyResolver {
    constructor() {
        this.cache = new Map(); // Cache for parsed metadata files
    }

    /**
     * Resolve complete metadata for an article by merging hierarchy
     * @param {string} articlePath - Full path to the article file
     * @param {Object} articleFrontmatter - Parsed frontmatter from the article
     * @returns {Object} Merged metadata object
     */
    resolveMetadata(articlePath, articleFrontmatter = {}) {
        // Check if hierarchy is enabled
        if (!config.validation.hierarchy.enabled) {
            return { ...articleFrontmatter };
        }

        if (config.debug.enableConsoleLogging) {
            console.log(`Resolving metadata hierarchy for: ${articlePath}`);
        }

        // Start with empty metadata
        let mergedMetadata = {};

        // 1. Find and merge repo-level metadata.md
        const repoMetadata = this.findRepoMetadata(articlePath);
        if (repoMetadata) {
            mergedMetadata = this.mergeMetadata(mergedMetadata, repoMetadata);
            if (config.debug.enableConsoleLogging) {
                console.log('Applied repo metadata:', repoMetadata);
            }
        }

        // 2. Find and merge TOC.md files from root to article directory
        const tocMetadataList = this.findTocMetadata(articlePath);
        for (const tocMetadata of tocMetadataList) {
            mergedMetadata = this.mergeMetadata(mergedMetadata, tocMetadata.metadata);
            if (config.debug.enableConsoleLogging) {
                console.log(`Applied TOC metadata from ${tocMetadata.path}:`, tocMetadata.metadata);
            }
        }

        // 3. Finally, merge article frontmatter (highest priority)
        mergedMetadata = this.mergeMetadata(mergedMetadata, articleFrontmatter);
        if (config.debug.enableConsoleLogging) {
            console.log('Applied article frontmatter:', articleFrontmatter);
            console.log('Final merged metadata:', mergedMetadata);
        }

        return mergedMetadata;
    }

    /**
     * Find repo-level metadata.md file
     * @param {string} articlePath - Path to the article
     * @returns {Object|null} Parsed metadata or null if not found
     */
    findRepoMetadata(articlePath) {
        const repoRoot = this.findRepoRoot(articlePath);
        if (!repoRoot) {
            return null;
        }

        const metadataPath = join(repoRoot, config.validation.hierarchy.repoMetadataFile);
        return this.parseMetadataFile(metadataPath);
    }

    /**
     * Find all TOC.md files in the hierarchy from repo root to article directory
     * @param {string} articlePath - Path to the article
     * @returns {Array<{path: string, metadata: Object}>} Array of TOC metadata objects
     */
    findTocMetadata(articlePath) {
        const repoRoot = this.findRepoRoot(articlePath);
        if (!repoRoot) {
            return [];
        }

        const articleDir = dirname(articlePath);
        const relativePath = relative(repoRoot, articleDir);

        // Split path into segments and build hierarchy
        const pathSegments = relativePath ? relativePath.split(/[/\\]/) : [];
        const tocMetadataList = [];

        // Check each directory level from root to article directory
        let currentPath = repoRoot;
        for (const segment of pathSegments) {
            currentPath = join(currentPath, segment);
            const tocPath = join(currentPath, config.validation.hierarchy.tocMetadataFile);

            const tocMetadata = this.parseMetadataFile(tocPath);
            if (tocMetadata) {
                tocMetadataList.push({
                    path: tocPath,
                    metadata: tocMetadata
                });
            }
        }

        return tocMetadataList;
    }

    /**
     * Find the repository root by looking for common repo indicators
     * @param {string} filePath - Starting file path
     * @returns {string|null} Repository root path or null if not found
     */
    findRepoRoot(filePath) {
        let currentDir = dirname(resolve(filePath));
        const maxLevels = 10; // Prevent infinite loops
        let level = 0;

        while (level < maxLevels) {
            // Check for common repo indicators
            const indicators = ['.git', 'package.json', 'README.md', 'metadata.md'];

            for (const indicator of indicators) {
                if (existsSync(join(currentDir, indicator))) {
                    return currentDir;
                }
            }

            const parentDir = dirname(currentDir);
            if (parentDir === currentDir) {
                // Reached filesystem root
                break;
            }

            currentDir = parentDir;
            level++;
        }

        return null;
    }

    /**
     * Parse metadata from a markdown file (metadata.md or TOC.md)
     * @param {string} filePath - Path to the metadata file
     * @returns {Object|null} Parsed frontmatter or null if file doesn't exist/parse fails
     */
    parseMetadataFile(filePath) {
        // Check cache first (if caching is enabled)
        if (config.validation.hierarchy.cacheMetadata && this.cache.has(filePath)) {
            return this.cache.get(filePath);
        }

        if (!existsSync(filePath)) {
            if (config.validation.hierarchy.cacheMetadata) {
                this.cache.set(filePath, null);
            }
            return null;
        }

        try {
            const content = readFileSync(filePath, 'utf8');
            const frontmatter = this.extractFrontmatter(content);

            if (config.validation.hierarchy.cacheMetadata) {
                this.cache.set(filePath, frontmatter);
            }
            return frontmatter;
        } catch (error) {
            if (config.debug.enableConsoleLogging) {
                console.warn(`Failed to parse metadata file ${filePath}:`, error.message);
            }
            if (config.validation.hierarchy.cacheMetadata) {
                this.cache.set(filePath, null);
            }
            return null;
        }
    }

    /**
     * Extract frontmatter from markdown content
     * @param {string} content - Markdown file content
     * @returns {Object|null} Parsed frontmatter or null if not found
     */
    extractFrontmatter(content) {
        const result = parseFrontmatter(content);

        if (!result.found) {
            return null;
        }

        if (result.error) {
            if (config.debug.enableConsoleLogging) {
                console.warn('Failed to parse YAML frontmatter:', result.error);
            }
            return null;
        }

        return result.data || {};
    }

    /**
     * Merge two metadata objects, with the second taking precedence
     * Handles array fields specially - they can be merged or overridden
     * @param {Object} base - Base metadata object
     * @param {Object} override - Override metadata object
     * @returns {Object} Merged metadata object
     */
    mergeMetadata(base, override) {
        if (!base) return { ...override };
        if (!override) return { ...base };

        const merged = { ...base };

        for (const [key, value] of Object.entries(override)) {
            if (value === null || value === undefined) {
                continue; // Skip null/undefined values
            }

            if (Array.isArray(value)) {
                // For array fields, override completely (don't merge arrays)
                // This matches the expected behavior where more specific values override general ones
                merged[key] = [...value];
            } else if (typeof value === 'object' && value !== null) {
                // For nested objects, merge recursively
                merged[key] = this.mergeMetadata(merged[key] || {}, value);
            } else {
                // For primitive values, override
                merged[key] = value;
            }
        }

        return merged;
    }

    /**
     * Clear the metadata cache (useful for testing or when files change)
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export default MetadataHierarchyResolver;
