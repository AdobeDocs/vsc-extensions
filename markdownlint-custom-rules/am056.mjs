// @ts-check
"use strict";

import OnDemandEventSchemaProcessor from "./on-demand-events-schema-processor.mjs";
import { addError } from "./custom-shared.mjs";
import { readFileSync } from "fs";
import yaml from "js-yaml";


export const names = ["AM056", "on-demand-event-validation"];
export const description = "On-demand event validation failure:";
export const tags = ["frontmatter", "events", "schema", "structure"];

const schemaProcessor = new OnDemandEventSchemaProcessor();

let validator = null;
let schemaLoaded = false;

function ensureSchemaLoaded() {
  if (schemaLoaded) return true;

  const success = schemaProcessor.loadSchemaSync();
  if (success) {
    validator = schemaProcessor.getValidator();
    schemaLoaded = true;
  }

  return schemaLoaded;
}

function parseFrontmatterBlock(lines, startSearchAt = 0) {
  let start = -1;
  let end = -1;

  for (let i = startSearchAt; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      start = i;
      break;
    }
  }
  if (start === -1) return { found: false };

  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { found: false };

  const yamlLines = lines.slice(start + 1, end);
  let yamlText = yamlLines.join("\n");

  // Normalize "&nbsp; - item" into valid YAML "- item"
  yamlText = yamlText.replace(/^\s*&nbsp;\s*-\s+/gm, (match) => {
    const indent = match.match(/^\s*/)?.[0] ?? "";
    return `${indent}- `;
  });

  try {
    const data = yaml.load(yamlText);
    return {
      found: true,
      data,
      startLine: start + 1,
      endLine: end + 1,
      yamlLines,
      contentStartIndex: end + 1,
    };
  } catch (e) {
    return {
      found: true,
      data: null,
      error: String(e?.message || e),
      startLine: start + 1,
      endLine: end + 1,
      yamlLines,
      contentStartIndex: end + 1,
    };
  }
}

function looksLikeTestMetaFrontmatter(obj) {
  if (!obj || typeof obj !== "object") return false;
  return Object.prototype.hasOwnProperty.call(obj, "expected_errors")
    || Object.prototype.hasOwnProperty.call(obj, "test_repo");
}

function firstNonEmptyLineIndex(lines, fromIndex) {
  for (let i = fromIndex; i < lines.length; i++) {
    if (lines[i].trim().length > 0) return i;
  }
  return -1;
}

function findFirstH1(lines, fromIndex) {
  for (let i = fromIndex; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+?)\s*$/);
    if (m) return { index: i, text: m[1].trim() };
  }
  return null;
}

function getFieldLineNumber(fieldName, yamlLines, startLine) {
  for (let i = 0; i < yamlLines.length; i++) {
    if (yamlLines[i].trim().startsWith(`${fieldName}:`)) {
      return startLine + i + 1;
    }
  }
  return startLine;
}

function formatAjvError(err, yamlLines, startLine) {
  // instancePath looks like "/doc-type" -> "doc-type"
  const path = err.instancePath ? err.instancePath.replace(/^\//, "") : "";
  const fieldForLine = path || (err.params?.missingProperty ?? "");
  const line = fieldForLine ? getFieldLineNumber(fieldForLine, yamlLines, startLine) : startLine;

  if (err.keyword === "required") {
    return { line, message: `Missing required field: '${err.params.missingProperty}'` };
  }
  if (err.keyword === "enum") {
    return { line, message: `Field '${path}' has invalid value '${err.data}'. Allowed values: ${err.params.allowedValues.join(", ")}` };
  }
  if (err.keyword === "type") {
    return { line, message: `Field '${path || "frontmatter"}' ${err.message}` };
  }

  return { line, message: `Field '${path || "frontmatter"}': ${err.message}` };
}

function normalizeScalarFields(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (data["last-update"] instanceof Date && !Number.isNaN(data["last-update"].getTime())) {
    data["last-update"] = data["last-update"].toISOString().slice(0, 10);
  }

  return data;
}

function getAllLines(params) {
  if (params.frontMatterLines && params.frontMatterLines.length > 0) {
    return [...params.frontMatterLines, ...(params.lines || [])];
  }

  try {
    return readFileSync(params.name, "utf8").split(/\r?\n/);
  } catch {
    return params.lines || [];
  }
}

function getSafeLineNumber(lineNumber, maxLineNumber) {
  const parsed = Number(lineNumber);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(Math.trunc(parsed), Math.max(1, maxLineNumber)));
}

function addSafeError(onError, lineNumber, detail, maxLineNumber) {
  addError(onError, getSafeLineNumber(lineNumber, maxLineNumber), detail);
}

export function function_(params, onError) {
  const lines = getAllLines(params);
  const markdownLines = params.lines || [];
  const frontMatterLineCount = (params.frontMatterLines || []).length;
  const maxReportLine = markdownLines.length || lines.length || 1;

  // 1) Parse first frontmatter block
  const fm1 = parseFrontmatterBlock(lines, 0);
  if (!fm1.found) {
    addSafeError(onError, 1, "Missing YAML frontmatter block", maxReportLine);
    return;
  }
  if (fm1.error) {
    addSafeError(onError, fm1.startLine - frontMatterLineCount, `Invalid YAML: ${fm1.error}`, maxReportLine);
    return;
  }

  // 2) If it looks like test meta frontmatter, parse the next block as the content frontmatter
  const fm = looksLikeTestMetaFrontmatter(fm1.data)
    ? parseFrontmatterBlock(lines, fm1.contentStartIndex)
    : fm1;

  if (!fm.found) {
    addSafeError(onError, 1, "Missing content frontmatter block after test metadata", maxReportLine);
    return;
  }
  const fmStartLine = fm.startLine ?? 1;
  if (fm.error) {
    addSafeError(onError, fmStartLine - frontMatterLineCount, `Invalid YAML: ${fm.error}`, maxReportLine);
    return;
  }
  if (!fm.data || typeof fm.data !== "object") {
    addSafeError(onError, fmStartLine - frontMatterLineCount, "Frontmatter must be a YAML object", maxReportLine);
    return;
  }

  // Skip files that are not on-demand events — AM056 only applies to Event and Value Video docs
  const docType = fm.data["doc-type"];
  if (docType !== "Event" && docType !== "Value Video") {
    return;
  }

  // 3) Schema validate
  if (!ensureSchemaLoaded()) {
    addSafeError(onError, fmStartLine - frontMatterLineCount, "Schema validation unavailable", maxReportLine);
    return;
  }

  const schema = schemaProcessor.getSchema();

  // Normalize CSV-supported fields into arrays (like AM020)
  if (schema?.properties) {
    for (const [key, definition] of Object.entries(schema.properties)) {
      if (definition["x-supports-csv"] && typeof fm.data[key] === "string") {
        fm.data[key] = fm.data[key]
          .split(",")
          .map(v => v.trim())
          .filter(Boolean);
      }
    }
  }

  normalizeScalarFields(fm.data);

  const ok = validator(fm.data);
  if (!ok && validator.errors) {
    const missingRequired = [];

    for (const err of validator.errors) {
      if (err.keyword === "required" && err.params?.missingProperty) {
        missingRequired.push(err.params.missingProperty);
        continue;
      }

      const { line, message } = formatAjvError(err, fm.yamlLines, fmStartLine);
      addSafeError(onError, line - frontMatterLineCount, message, maxReportLine);
    }

    if (missingRequired.length > 0) {
      const uniqueMissing = [...new Set(missingRequired)];
      addSafeError(
        onError,
        1,
        `Missing required frontmatter fields: ${uniqueMissing.join(", ")}`,
        maxReportLine
      );
    }
  }

  // 4) Structure validation
  const bodyStart = Math.max(0, (fm.contentStartIndex ?? 0) - frontMatterLineCount);
  const firstBody = firstNonEmptyLineIndex(markdownLines, bodyStart);

  if (firstBody !== -1) {
    const firstLine = markdownLines[firstBody].trim();
    if (!firstLine.startsWith(">[!VIDEO](") && !firstLine.startsWith(">\\[!VIDEO](")) {
      addSafeError(onError, firstBody + 1, "Expected first content block to be a video embed: >[!VIDEO](...)", maxReportLine);
    }
  }

  const h1 = findFirstH1(markdownLines, bodyStart);
  if (!h1) {
    addSafeError(onError, bodyStart + 1, "Missing H1 title heading (# ...)", maxReportLine);
  }
}

export default {
  names,
  description,
  tags,
  function: function_,
};