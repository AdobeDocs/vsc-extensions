// @ts-check

"use strict";

import { addError } from "./custom-shared.mjs";
import FrontmatterSchemaProcessor from './frontmatter-schema-processor.mjs';
import MetadataHierarchyResolver from './metadata-hierarchy-resolver.mjs';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';
import config from './frontmatter-config.mjs';

export const names = ["AM020", "frontmatter-validation"];
export const description = "Schema validation failure:";
export const tags = ["frontmatter", "yaml", "schema"];

// Constants for feature validation messaging
const LARGE_FEATURE_LIST_THRESHOLD = 50;
const SAMPLE_FEATURE_COUNT = 10;
const FEATURE_MAPPINGS_URL = 'https://github.com/Adobe-Enterprise-Docs/markdownlint-custom/blob/main/custom-rules/feature.yml';

// Constants for repository-specific validation
const SLIDES_REPO_PREFIX = 'slides.';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize the schema processor and hierarchy resolver
const schemaProcessor = new FrontmatterSchemaProcessor();
const hierarchyResolver = new MetadataHierarchyResolver();
let validateFrontmatter = null;
let schemaLoaded = false;
let schemaLoadingPromise = null;

// Function to ensure schema is loaded synchronously
function ensureSchemaLoaded() {
    if (schemaLoaded) {
        return true;
    }

    // Use the synchronous loading method from the schema processor
    const success = schemaProcessor.loadSchemaSync();

    if (success) {
        validateFrontmatter = schemaProcessor.getValidator();
        schemaLoaded = true;
        if (config.debug.enableConsoleLogging) {
            console.log('Frontmatter schema processor initialized');
        }
    } else {
        if (config.debug.enableConsoleLogging) {
            console.log('Failed to load schema synchronously');
        }
    }

    return schemaLoaded;
}

function parseFrontmatter(lines) {
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
  const yamlContent = yamlLines.join('\n');

  try {
    // Enhanced YAML parser for better compatibility
    const data = parseYamlContent(yamlContent);

    return {
      found: true,
      data,
      startLine: frontmatterStart + 1,
      endLine: frontmatterEnd + 1,
      yamlLines: yamlLines
    };
  } catch (error) {
    return {
      found: true,
      data: null,
      error: error.message,
      startLine: frontmatterStart + 1,
      endLine: frontmatterEnd + 1
    };
  }
}

function parseYamlContent(yamlContent) {
  const data = {};
  const lines = yamlContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Handle different YAML value types
      if (value === '') {
        // Check if this is a multi-line array or object
        const nextLines = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.match(/^\s*-\s+/) || nextLine.match(/^\s+\w+:/)) {
            nextLines.push(nextLine);
          } else if (nextLine.trim() && !nextLine.startsWith(' ')) {
            break;
          }
        }

        if (nextLines.length > 0) {
          // Parse array items
          if (nextLines.every(line => line.match(/^\s*-\s+/))) {
            value = nextLines.map(line => line.replace(/^\s*-\s+/, '').trim());
            i += nextLines.length;
          } else {
            // Parse nested object (simplified)
            const obj = {};
            for (const nextLine of nextLines) {
              const objMatch = nextLine.match(/^\s+([^:]+):\s*(.*)$/);
              if (objMatch) {
                obj[objMatch[1].trim()] = parseValue(objMatch[2].trim());
              }
            }
            value = obj;
            i += nextLines.length;
          }
        }
      } else {
        value = parseValue(value);
      }

      data[key] = value;
    }
  }

  return data;
}

function parseValue(value) {
  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Handle booleans
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Handle numbers
  if (!isNaN(value) && !isNaN(parseFloat(value))) {
    return parseFloat(value);
  }

  // Handle inline arrays
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(v => parseValue(v.trim()));
  }

  return value;
}

function getFieldLineNumber(fieldName, yamlLines, startLine) {
  for (let i = 0; i < yamlLines.length; i++) {
    if (yamlLines[i].trim().startsWith(`${fieldName}:`)) {
      return startLine + i + 1;
    }
  }
  return startLine;
}

/**
 * Check if a file should be skipped from frontmatter validation
 * @param {string} filePath - Full path to the file being validated
 * @returns {boolean} True if the file should be skipped
 */
function shouldSkipHierarchyFile(filePath) {
  if (!config.validation.hierarchy.enabled || !config.validation.hierarchy.skipValidationOnHierarchyFiles) {
    return false; // If hierarchy is disabled or skip is disabled, don't skip any files
  }

  const fileName = filePath.split(/[/\\]/).pop(); // Get just the filename

  // Skip repo-level metadata file
  if (fileName === config.validation.hierarchy.repoMetadataFile) {
    return true;
  }

  // Skip TOC files
  if (fileName.toLowerCase() === config.validation.hierarchy.tocMetadataFile.toLowerCase()) {
    return true;
  }

  return false;
}


function formatSchemaError(error, yamlLines, startLine) {
  const fieldPath = error.instancePath ? error.instancePath.slice(1) : 'root';
  const lineNumber = fieldPath ? getFieldLineNumber(fieldPath, yamlLines, startLine) : startLine;

  let message = '';

  switch (error.keyword) {
    case 'required':
      message = `Missing required field: '${error.params.missingProperty}'`;
      break;
    case 'type':
      // AEM Edge accepts only JSON booleans for index/hide, not YAML 1.1 aliases (yes/y/no/n)
      if (
        error.params.type === 'boolean' &&
        (fieldPath === 'index' || fieldPath === 'hide') &&
        typeof error.data === 'string'
      ) {
        const v = error.data.trim().toLowerCase();
        if (v === 'yes' || v === 'y' || v === 'no' || v === 'n') {
          message =
            `Field '${fieldPath}' must use true or false, not "${error.data}" (AEM Edge ignores yes, y, no, and n)`;
          break;
        }
      }
      // Special handling for array fields that got strings
      if (error.params.type === 'array' && typeof error.data === 'string') {
        const csvFields = schemaProcessor.getCsvSupportedFields();
        if (csvFields.includes(fieldPath)) {
          message = `Field '${fieldPath}' should be ${error.params.type} but got ${typeof error.data}. You can provide comma-separated values like "Value1, Value2"`;
        } else {
          message = `Field '${fieldPath}' only accepts a single value. Please provide one value only (found: "${error.data}")`;
        }
      } else {
        message = `Field '${fieldPath}' should be ${error.params.type} but got ${typeof error.data}`;
      }
      break;
    case 'enum':
      message = `Field '${fieldPath}' has invalid value '${error.data}'. Allowed values: ${error.params.allowedValues.join(', ')}`;
      break;
    case 'pattern':
      message = `Field '${fieldPath}' has invalid format: '${error.data}' (should match pattern: ${error.params.pattern})`;
      break;
    case 'format':
      message = `Field '${fieldPath}' has invalid ${error.params.format} format: '${error.data}'`;
      break;
    case 'minLength':
      message = `Field '${fieldPath}' is too short (minimum ${error.params.limit} characters)`;
      break;
    case 'maxLength':
      message = `Field '${fieldPath}' is too long (maximum ${error.params.limit} characters)`;
      break;
    case 'minimum':
      message = `Field '${fieldPath}' value ${error.data} is below minimum ${error.params.limit}`;
      break;
    case 'maximum':
      message = `Field '${fieldPath}' value ${error.data} is above maximum ${error.params.limit}`;
      break;
    case 'uniqueItems':
      message = `Field '${fieldPath}' contains duplicate items`;
      break;
    case 'additionalProperties':
      message = `Unknown field '${error.params.additionalProperty}' is not allowed`;
      break;
    default:
      message = `Field '${fieldPath}': ${error.message}`;
  }

  return { lineNumber, message };
}

export function function_(params, onError) {
  // Skip validation for hierarchy metadata files
  if (shouldSkipHierarchyFile(params.name)) {
    if (config.debug.enableConsoleLogging) {
      console.log(`Skipping frontmatter validation for hierarchy file: ${params.name}`);
    }
    return;
  }

  // Skip validation for files in help/_includes directory
  if (params.name.replace(/\\/g, '/').includes('help/_includes')) {
    if (config.debug.enableConsoleLogging) {
      console.log(`Skipping frontmatter validation for includes file: ${params.name}`);
    }
    return;
  }

  /**
   * markdownlint expects onError lineNumber 1-based within params.lines (body only).
   * Convert a full-file line number; frontmatter YAML maps to the first body line when needed.
   */
  const bodyRelativeLineNumber = (absolute1Based) => {
    const fmLen = (params.frontMatterLines || []).length;
    const bodyLen = (params.lines || []).length;
    const rel = absolute1Based - fmLen;
    if (bodyLen < 1) {
      return 1;
    }
    if (rel < 1) {
      return 1;
    }
    if (rel > bodyLen) {
      return bodyLen;
    }
    return rel;
  };

  let lines = [];

  // Use frontMatterLines if available, otherwise fall back to reading the file
  if (params.frontMatterLines && params.frontMatterLines.length > 0) {
    // Combine frontmatter lines with content lines
    lines = [...params.frontMatterLines, ...params.lines];
  } else {
    try {
      // params.name contains the full path, so use it directly
      const fileContent = readFileSync(params.name, 'utf8');
      lines = fileContent.split('\n');
    } catch (error) {
      // Fallback to params.lines if file reading fails
      lines = params.lines || [];
    }
  }

  // Parse frontmatter
  const frontmatter = parseFrontmatter(lines);

  if (!frontmatter.found) {
    addError(onError, bodyRelativeLineNumber(1), "No frontmatter found: Missing frontmatter section");
    return;
  }

  if (frontmatter.error) {
    addError(onError, bodyRelativeLineNumber(frontmatter.startLine), `Invalid YAML syntax: ${frontmatter.error}`);
    return;
  }

  if (!frontmatter.data) {
    addError(onError, bodyRelativeLineNumber(frontmatter.startLine), "Frontmatter is empty");
    return;
  }

  // Ensure schema is loaded before CSV processing and validation
  const schemaReady = ensureSchemaLoaded();

  // Resolve metadata hierarchy (metadata.md -> TOC.md -> article frontmatter)
  const mergedMetadata = hierarchyResolver.resolveMetadata(params.name, frontmatter.data);

  // Convert CSV strings to arrays for fields that expect arrays
  const processedData = { ...mergedMetadata };
  const arrayFields = schemaProcessor.getCsvSupportedFields();

  for (const field of arrayFields) {
    if (processedData[field] && typeof processedData[field] === 'string') {
      processedData[field] = processedData[field].split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
  }

  // Debug: show schema loading status
  if (config.debug.enableConsoleLogging) {
    console.log(`Schema loaded: ${schemaLoaded}, Validator available: ${!!validateFrontmatter}`);
  }


  // Validate using JSON Schema if available
  if (validateFrontmatter && schemaLoaded) {
    const valid = validateFrontmatter(processedData);

    if (config.debug.enableConsoleLogging) {
      console.log('Schema validation result:', valid);
      console.log('Processed data:', processedData);
      const schema = schemaProcessor.getSchema();
      if (schema && schema.properties.solution?.items?.enum) {
        console.log('Solution enum values in schema:', schema.properties.solution.items.enum);
      }
    }

    if (!valid && validateFrontmatter.errors) {
      // Debug: show what errors we got from schema validation
      if (config.debug.enableConsoleLogging) {
        console.log('Schema validation errors:', validateFrontmatter.errors);
      }

      // Filter out feature validation errors for custom solution-aware validation
      const nonFeatureErrors = [];
      const featureErrors = [];

      for (const error of validateFrontmatter.errors) {
        if (error.instancePath && error.instancePath.includes('/feature/')) {
          featureErrors.push(error);
        } else {
          nonFeatureErrors.push(error);
        }
      }

      // Check if we have both solution and feature errors for combined reporting
      const hasSolutionError = nonFeatureErrors.some(error => error.instancePath?.includes('/solution/'));
      const hasFeatureError = featureErrors.length > 0;

      if (hasSolutionError && hasFeatureError) {
        // Combine both errors into a single comprehensive message
        const solutionError = nonFeatureErrors.find(error => error.instancePath?.includes('/solution/'));
        const solutionValues = solutionError?.schema || [];
        const invalidSolution = processedData.solution?.[0] || 'unknown';
        const invalidFeature = processedData.feature?.[0] || 'unknown';

        const combinedMessage = `Multiple validation errors: ` +
          `Field 'solution' has invalid value '${invalidSolution}'. ` +
          `Field 'feature' has invalid value '${invalidFeature}'. ` +
          `Valid solutions: ${solutionValues.join(', ')}. ` +
          `Note: Feature validation requires a valid solution first.`;

        addError(onError, bodyRelativeLineNumber(frontmatter.startLine + 1), combinedMessage);
      } else {
        // Report non-feature errors individually
        for (const error of nonFeatureErrors) {
          const { lineNumber, message } = formatSchemaError(
            error,
            frontmatter.yamlLines,
            frontmatter.startLine
          );
          addError(onError, bodyRelativeLineNumber(lineNumber), message);
        }

        // Handle feature errors with solution-aware validation
        if (featureErrors.length > 0 && processedData.feature && processedData.solution) {
          const featureValidation = schemaProcessor.validateFeaturesForSolution(
            processedData.feature,
            processedData.solution
          );

          if (featureValidation.invalid.length > 0 && featureValidation.availableFeatures.length > 0) {
            // Solution-aware validation (valid solution with invalid features)
            const invalidFeatures = featureValidation.invalid.join(', ');

            // Check if this is general validation (solution has no specific features mapped)
            const allFeatures = schemaProcessor.getSchema()?.properties?.feature?.items?.enum || [];
            const isGeneralValidation = featureValidation.availableFeatures.length === allFeatures.length;

            let message;
            if (isGeneralValidation && featureValidation.availableFeatures.length > LARGE_FEATURE_LIST_THRESHOLD) {
              // Show concise message for general validation with many features
              const sampleFeatures = featureValidation.availableFeatures.slice(0, SAMPLE_FEATURE_COUNT).join(', ');
              message = `Field 'feature' has invalid value(s) '${invalidFeatures}' for solution '${processedData.solution.join(', ')}'. ` +
                `Note: This solution has no specific features mapped, validating against all ${featureValidation.availableFeatures.length} available features. ` +
                `Some valid features include: ${sampleFeatures}, and ${featureValidation.availableFeatures.length - SAMPLE_FEATURE_COUNT} more. ` +
                `For the complete list of features and solution mappings, see ${FEATURE_MAPPINGS_URL}`;
            } else {
              // Show full list for solution-specific features
              const availableFeatures = featureValidation.availableFeatures.join(', ');
              message = `Field 'feature' has invalid value(s) '${invalidFeatures}' for solution '${processedData.solution.join(', ')}'. ` +
                `Available features for this solution: ${availableFeatures}. ` +
                `For the complete feature mappings, see ${FEATURE_MAPPINGS_URL}`;
            }

            // Find the line number for the feature field
            let featureLineNumber = frontmatter.startLine + 1;
            for (let i = 0; i < frontmatter.yamlLines.length; i++) {
              if (frontmatter.yamlLines[i].includes('feature:')) {
                featureLineNumber = frontmatter.startLine + i + 1;
                break;
              }
            }

            addError(onError, bodyRelativeLineNumber(featureLineNumber), message);
          } else if (featureValidation.invalid.length > 0) {
            // Invalid solution, so can't provide solution-specific features - fall back to general error
            for (const error of featureErrors) {
              const { lineNumber, message } = formatSchemaError(
                error,
                frontmatter.yamlLines,
                frontmatter.startLine
              );
              addError(onError, bodyRelativeLineNumber(lineNumber), message);
            }
          }
        } else if (featureErrors.length > 0) {
          // Fallback to original schema error if no solution context
          for (const error of featureErrors) {
            const { lineNumber, message } = formatSchemaError(
              error,
              frontmatter.yamlLines,
              frontmatter.startLine
            );
            addError(onError, bodyRelativeLineNumber(lineNumber), message);
          }
        }
      }

      // Don't return early - let all validation errors be reported
      // The caller will handle stopping processing if there are errors
    }
  } else {
    // Schema validation is not available - fail the validation
    if (config.debug.enableConsoleLogging) {
      console.log('Schema validation not available - validation failed');
    }
    addError(onError, bodyRelativeLineNumber(frontmatter.startLine), "Schema validation unavailable: Cannot validate frontmatter without properly loaded schema");
    return;
  }

  // Custom validation: required fields for slides repositories (all languages)
  // Check for test_repo frontmatter field (for test files to simulate different repo environments)
  // Prioritize test_repo over GITHUB_REPOSITORY for testing purposes
  const testRepo = processedData.test_repo || "";

  let isSlidesRepo;
  if (testRepo) {
    // If test_repo is explicitly set, use it (for test files)
    isSlidesRepo = testRepo.startsWith(SLIDES_REPO_PREFIX);
  } else {
    // Otherwise, use the actual GITHUB_REPOSITORY environment variable
    const githubRepo = process.env.GITHUB_REPOSITORY || "";
    const repoName = githubRepo.includes("/") ? githubRepo.split("/")[1] : "";
    isSlidesRepo = repoName && repoName.startsWith(SLIDES_REPO_PREFIX);
  }

  if (isSlidesRepo) {
    // Required fields from exl-admin slides processor
    // Note: title and description are already validated by the schema's global 'required' field,
    // so we only need to check the slides-specific required fields here to avoid duplicate errors
    const slidesSpecificRequiredFields = [
      'solution',
      'feature',
      'role',
      'level'
    ];

    for (const field of slidesSpecificRequiredFields) {
      // Check if field is missing (undefined or null)
      if (!processedData.hasOwnProperty(field) || processedData[field] === null || processedData[field] === undefined) {
        // Use frontmatter start line since field doesn't exist
        const lineNumber = frontmatter.startLine + 1;
        addError(onError, bodyRelativeLineNumber(lineNumber), `Missing required field: '${field}' (required for slides repositories)`);
      }
    }
  }
}

export default {
  names,
  description,
  tags,
  function: function_,
};
