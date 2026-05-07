// @ts-check

"use strict";

import { parseSlideshow } from "./slideshow-parser.mjs";

// Global array to collect all slideshow data
let allSlideshowData = [];

// Debug flag to control console output
const DEBUG_OUTPUT = false;

function parseAndCheckNumber (numberString) {
    return !isNaN(Number.parseFloat(numberString));
}

const CALLOUT_TYPES = {
    "circle": {
        // Passing function just in case we have to swap the generic check out for a
        // more specific one for individual values in the future
        "x": parseAndCheckNumber,
        "y": parseAndCheckNumber,
        "r": parseAndCheckNumber
    },
    "rectangle": {
        "x1": parseAndCheckNumber,
        "x2": parseAndCheckNumber,
        "y1": parseAndCheckNumber,
        "y2": parseAndCheckNumber
    }
}

export const names = ["AM043", "slide-component-structure"];
export const description = "Validates slide component structure";
export const tags = ["slides"];

export async function function_(params, onError) {
    const slideshow = parseSlideshow(params);

    // Report all parse errors found during structure validation
    for (const error of slideshow.parseErrors) {
        onError({
            lineNumber: error.lineNumber,
            detail: error.detail,
        });
    }

    // Check if slideshow has proper structure (only if we found a slideshow)
    if (slideshow.slideshowActive && slideshow.slideshowClosed) {
        if (!slideshow.hasIntro) {
            onError({
                lineNumber: slideshow.startLine,
                detail: "Slideshow must contain an :::intro section",
            });
        }

        if (slideshow.slideCount === 0) {
            onError({
                lineNumber: slideshow.startLine,
                detail: "Slideshow must contain at least one :::slide section",
            });
        }

        // Check for blank/empty sections
        if (slideshow.intro && slideshow.intro.lines) {
            const hasContent = slideshow.intro.lines.some(line =>
                line.text && line.text.trim() !== ""
            );
            if (!hasContent) {
                onError({
                    lineNumber: slideshow.intro.startLine,
                    detail: ":::intro section cannot be empty",
                });
            }
        }

        // Check each slide for blank content
        for (const slide of slideshow.slides) {
            const hasContent = slide.lines.some(line =>
                line.text && line.text.trim() !== ""

            );
            if (!hasContent) {
                onError({
                    lineNumber: slide.startLine,
                    detail: ":::slide section cannot be empty",
                });
            }
        }

        slideshow.callouts.forEach(callout => {
            //console.log(`Validating callout: ${JSON.stringify(callout)}`)
            const {attributes, lineNumber} = callout;
            const typeValidation = CALLOUT_TYPES[attributes.type];

            // Check that all required fields are present and value valid
            if (typeof typeValidation !== "undefined") {
                Object.getOwnPropertyNames(typeValidation).forEach(prop => {
                    const shapeValue = attributes[prop];

                    if (!typeValidation[prop]?.call({}, shapeValue)) {
                        onError({
                            lineNumber,
                            detail: `Slide callout shape has invalid value: ${prop}=${shapeValue}`
                        });
                    }
                });

            } else {
                onError({
                    lineNumber,
                    detail: `Slide callout shape has invalid type: ${attributes.type}`
                });
            }
        })
    }

    // Validate blank lines around slide components (AM044 functionality)
    if (slideshow.slideshowActive) {
        const lines = params.lines;

        // Track code block state with proper fence matching
        let inCodeBlock = false;
        let codeBlockFence = null;  // Will be '`' or '~'
        let codeBlockFenceCount = 0;  // Number of fence characters

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Track backtick code fence toggles BEFORE other checks
            // Properly match opening and closing fences of the same type
            const fenceMatch = line.match(/^[\s]*`{3,}/);
            if (fenceMatch) {
                const fenceChar = '`';
                const fenceCount = fenceMatch[0].trimStart().length;

                if (!inCodeBlock) {
                    // Opening fence
                    inCodeBlock = true;
                    codeBlockFence = fenceChar;
                    codeBlockFenceCount = fenceCount;
                } else if (fenceChar === codeBlockFence && fenceCount >= codeBlockFenceCount) {
                    // Closing fence must match type and have at least as many chars
                    inCodeBlock = false;
                    codeBlockFence = null;
                    codeBlockFenceCount = 0;
                }
                // Otherwise, it's a fence inside the code block, ignore it
            }

            // Skip validation inside code blocks
            if (inCodeBlock) {
                continue;
            }

            // Use trimmed line for pattern matching
            const trimmedLine = line.trim();

            // Check for component opening lines (:::intro, :::slide)
            if (trimmedLine.match(/^:::(?:intro|slide)$/)) {

                // Check for blank line before (unless it's the first line)
                if (i > 0) {
                    const prevLine = lines[i - 1].trim();
                    if (prevLine !== "") {
                        onError({
                            lineNumber,
                            detail: "Slide component should have a blank line before it"
                        });
                    }
                }

                // Check for blank line after (unless it's the last line)
                if (i < lines.length - 1) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine !== "") {
                        onError({
                            lineNumber,
                            detail: "Slide component should have a blank line after it"
                        });
                    }
                }
            }

            // Check for component closing lines (:::)
            if (trimmedLine === ":::" && i > 0) {

                // Check for blank line before (unless it's the first line)
                const prevLine = lines[i - 1].trim();
                if (prevLine !== "") {
                    onError({
                        lineNumber,
                        detail: "Slide component closing should have a blank line before it"
                    });
                }

                // Check for blank line after (unless it's the last line or followed by ::::)
                if (i < lines.length - 1) {
                    const nextLine = lines[i + 1].trim();
                    // Allow :::: (slideshow closing) directly after component closing, otherwise require blank line
                    if (nextLine !== "" && !nextLine.match(/^::::\s*$/)) {
                        onError({
                            lineNumber,
                            detail: "Slide component closing should have a blank line after it"
                        });
                    }
                }
            }
        }
    }

    // Output collected slide data for debugging/processing
    if (slideshow.slideshowActive && params.name) {
        if (DEBUG_OUTPUT) {
            console.log(`\n=== SLIDESHOW DATA for ${params.name} ===`);
            console.log(JSON.stringify(slideshow, null, 2));
            console.log("=== END SLIDESHOW DATA ===\n");
        }

        // Clear previous data for fresh run and add this slideshow to the global collection
        if (
            allSlideshowData.length === 0 ||
            params.name.includes("analytics-slides-1")
        ) {
            allSlideshowData = []; // Reset for new batch
        }

        allSlideshowData.push({
            ...slideshow,
            processedAt: new Date().toISOString(),
        });

        // Write consolidated slide data to single JSON file
        try {
            const fs = await import("fs");
            const path = await import("path");

            const consolidatedData = {
                timestamp: new Date().toISOString(),
                totalFiles: allSlideshowData.length,
                totalSlides: allSlideshowData.reduce(
                    (sum, slideshow) => sum + slideshow.slides.length,
                    0,
                ),
                slideshows: allSlideshowData,
            };

            const debugFileName = "slideshow-data-consolidated.json";
            const debugFilePath = path.join(process.cwd(), debugFileName);

            fs.writeFileSync(
                debugFilePath,
                JSON.stringify(consolidatedData, null, 2),
                "utf8",
            );
            if (DEBUG_OUTPUT) {
                console.log(`📁 Consolidated slide data written to: ${debugFileName}`);
                console.log(
                    `📊 Total: ${allSlideshowData.length} file(s), ${consolidatedData.totalSlides} slide(s)`,
                );
            }
        } catch (error) {
            console.error(
                `❌ Failed to write consolidated debug file: ${error.message}`,
            );
        }
    }
}

export default {
    names,
    description,
    tags,
    function: function_,
};
