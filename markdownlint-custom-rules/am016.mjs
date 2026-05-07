// @ts-check

"use strict";

import * as shared from "./custom-shared.mjs";

export const names = ["AM016", "mismatched-symbols"];
export const description = "Unmatched symbols";
export const tags = ["code", "indent_level"];

export function function_(params, onError) {
    // Build a set of line numbers that are inside HTML blocks using the token parser
    const htmlBlockLines = new Set();
    shared.filterTokens(params, 'html_block', function(token) {
        if (Array.isArray(token.map)) {
            // token.map is [startLine, endLine] (0-indexed)
            for (let lineIdx = token.map[0]; lineIdx < token.map[1]; lineIdx++) {
                htmlBlockLines.add(lineIdx);
            }
        }
    });

    let codeFenceState = {
        inCodeBlock: false,
        fenceChar: null,
        fenceCount: 0
    };

    shared.forEachLine(params, function forLine(line, i) {
        const prevInCodeBlock = codeFenceState.inCodeBlock;
        codeFenceState = shared.updateCodeFenceState(line, codeFenceState);
        const inCodeBlock = codeFenceState.inCodeBlock;

        // Skip if in code block, HTML block, or transitioning out of code block
        if (inCodeBlock || prevInCodeBlock || htmlBlockLines.has(i)) {
            return;
        }

        // Remove blockquote markers (>) at start of line to avoid false positives
        // Must do this BEFORE checking angle brackets
        line = line.replace(/^[\s]*>+[\s]*/, '');

        // Remove code spans BEFORE handling HTML tags
        // (Inside code spans, backslashes are literal, not escape characters)
        // Process longest code spans first (triple, double, then single backticks)
        line = line.replace(/```.*?```/g, ' <code3> ');
        line = line.replace(/^[\s]*[>]*[\s]*```/, '<fence>');
        line = line.replace(/``.*?``/g, ' <code2> ');
        line = line.replace(/`[^`]*`/g, ' <code1> ');

        // Remove inline HTML tags and their content AFTER code spans are removed
        // This prevents false positives from brackets/braces inside HTML tags
        line = line.replace(/<(code|pre|span|em|strong|b|i|kbd|var|samp|mark|u|a)[^>]*>.*?<\/\1>/gi, ' <html> ');

        // Now replace escaped backticks in the remaining text (outside code spans)
        // This prevents \\` from being counted as an unmatched backtick
        line = line.replace(/\\`/g, '&grave');

        // Define validation rules for different character types
        const validations = [
            {
                name: 'backticks',
                symbol: '`',
                pattern: /`/g,
                check: (count) => count % 2 !== 0,
                message: (count) => `Unmatched backticks: found ${count} (must be even)`
            },
            {
                name: 'brackets',
                symbol: '[]',
                openPattern: /\[/g,
                closePattern: /\]/g,
                check: (open, close) => open !== close,
                message: (open, close) => open > close
                    ? `Unmatched brackets: ${open - close} unclosed '['`
                    : `Unmatched brackets: ${close - open} extra ']'`
            },
            {
                name: 'braces',
                symbol: '{}',
                openPattern: /\{/g,
                closePattern: /\}/g,
                check: (open, close) => open !== close,
                message: (open, close) => open > close
                    ? `Unmatched braces: ${open - close} unclosed '{'`
                    : `Unmatched braces: ${close - open} extra '}'`
            },
            // Note: Angle brackets and parentheses validation are disabled because they
            // often appear legitimately in prose (e.g., HTML tags, comparison operators,
            // parenthetical remarks spanning multiple lines)
            // {
            //     name: 'parentheses',
            //     symbol: '()',
            //     openPattern: /\(/g,
            //     closePattern: /\)/g,
            //     check: (open, close) => open !== close,
            //     message: (open, close) => open > close
            //         ? `Unmatched parentheses: ${open - close} unclosed '('`
            //         : `Unmatched parentheses: ${close - open} extra ')'`
            // }
        ];

        // Check each validation rule
        validations.forEach(rule => {
            if (rule.pattern) {
                // Single pattern (e.g., backticks)
                const count = (line.match(rule.pattern) || []).length;
                if (rule.check(count)) {
                    shared.addError(onError, i + 1, rule.message(count), params.lines[i].trim());
                }
            } else {
                // Open/close patterns (e.g., brackets, braces)
                const openCount = (line.match(rule.openPattern) || []).length;
                const closeCount = (line.match(rule.closePattern) || []).length;
                if (rule.check(openCount, closeCount)) {
                    shared.addError(onError, i + 1, rule.message(openCount, closeCount), params.lines[i].trim());
                }
            }
        });
    });
}

export default {
    names,
    description,
    tags,
    function: function_,
};