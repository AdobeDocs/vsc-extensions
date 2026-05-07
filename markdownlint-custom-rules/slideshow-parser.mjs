// @ts-check

"use strict";

// Global cache to store parsed slideshow data to avoid re-parsing
const slideshowCache = new Map();

/**
 * Shared slideshow parser that builds the data structure once per file
 * and can be used by multiple validation rules
 */
export function parseSlideshow(params) {
    const cacheKey = params.name || "unknown";

    // Return cached data if already parsed
    if (slideshowCache.has(cacheKey)) {
        return slideshowCache.get(cacheKey);
    }

    const lines = params.lines;

    const slidesRe = /^::::slides\b/i;
    const fourColonDirectiveRe = /^::::[a-z][a-z0-9-]*\b/i;  // Match any four-colon directive: must start with letter, can contain letters/numbers/hyphens, word boundary
    const slidesCloseRe = /^::::[ \t]*$/;  // Allow optional trailing horizontal whitespace only
    const introOpenRe = /^:::intro\b/i;
    const slideOpenRe = /^:::slide\b/i;
    const containerCloseRe = /^:::[ \t]*$/;  // Allow optional trailing horizontal whitespace only
    const headingRe = /^#{1,6}\s+(.+)$/;
    const imageRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const calloutRe = /^\s*-\s*:callout\[([^\]]+)\]\{([^}]+)\}/;

    // Helper function to check if a specific position in a line is within HTML comments
    function isPositionInComment(lineIndex, position, lines) {
        let inComment = false;

        // Process all lines up to and including the target line
        for (let i = 0; i <= lineIndex; i++) {
            const line = lines[i];
            let pos = 0;

            while (pos < line.length) {
                if (!inComment) {
                    // Look for comment start
                    const startPos = line.indexOf('<!--', pos);
                    if (startPos !== -1) {
                        // Check if we're on the target line and the position is before the comment start
                        if (i === lineIndex && position < startPos) {
                            return false; // Position is before comment starts
                        }

                        // Check if there's a comment end on the same line after the start
                        const endPos = line.indexOf('-->', startPos + 4);
                        if (endPos !== -1) {
                            // Complete comment on same line
                            if (i === lineIndex && position >= startPos && position < endPos + 3) {
                                return true; // Position is within the comment
                            }
                            pos = endPos + 3;
                        } else {
                            // Comment starts but doesn't end on this line
                            inComment = true;
                            if (i === lineIndex && position >= startPos) {
                                return true; // Position is within the comment that continues
                            }
                            break;
                        }
                    } else {
                        // No comment start found on this line
                        if (i === lineIndex) {
                            return false; // Position is not in a comment
                        }
                        break;
                    }
                } else {
                    // We're in a comment, look for comment end
                    const endPos = line.indexOf('-->', pos);
                    if (endPos !== -1) {
                        // Comment ends on this line
                        if (i === lineIndex && position < endPos + 3) {
                            return true; // Position is within the comment
                        }
                        inComment = false;
                        pos = endPos + 3;
                    } else {
                        // Comment continues to next line
                        if (i === lineIndex) {
                            return true; // Entire line is within comment
                        }
                        break;
                    }
                }
            }
        }

        return inComment;
    }

    // Helper function to check if slide syntax on a line is within comments
    function isSlidesSyntaxInComment(lineIndex, line, lines) {
        const trimmedLine = line.trim();

        // Find the position of slide syntax patterns
        const slidePatterns = [
            { regex: /^::::slides\b/i, name: 'slides-open' },
            { regex: /^::::\s*$/, name: 'slides-close' },
            { regex: /^:::intro\b/i, name: 'intro-open' },
            { regex: /^:::slide\b/i, name: 'slide-open' },
            { regex: /^:::\s*$/, name: 'container-close' }
        ];

        for (const pattern of slidePatterns) {
            if (pattern.regex.test(trimmedLine)) {
                // Find where this pattern starts in the original line
                const patternMatch = line.match(pattern.regex);
                if (patternMatch) {
                    const patternStart = line.indexOf(patternMatch[0]);
                    return isPositionInComment(lineIndex, patternStart, lines);
                }
            }
        }

        return false;
    }

    // Container tracking stack for proper nesting validation
    const containerStack = [];
    const parseErrors = [];

    // Helper function to push container to stack
    function pushContainer(type, lineNumber) {
        containerStack.push({
            type: type,           // 'slideshow', 'intro', 'slide'
            openLine: lineNumber,
            closed: false
        });
    }

    // Helper function to close container
    function closeContainer(expectedType, lineNumber) {
        if (containerStack.length === 0) {
            return { error: `Found closing tag without matching opening container` };
        }

        const topContainer = containerStack[containerStack.length - 1];
        if (topContainer.type !== expectedType) {
            return {
                error: `Mismatched container: expected ${topContainer.type}, found ${expectedType} closing tag`,
                openLine: topContainer.openLine
            };
        }

        topContainer.closed = true;
        containerStack.pop();
        return { success: true };
    }

    // Container to hold all slide data
    const slideshow = {
        callouts: [],
        sourceFile: params.name || "unknown",
        sourceContent: lines.join("\n"),
        startLine: 0,
        endLine: 0,
        intro: null,
        slides: [],
        parseErrors: parseErrors,
        containerStack: containerStack,
    };

    let slideshowActive = false;
    let slideshowClosed = false;

    let insideIntro = false;
    let introStartLine = 0;
    let introClosed = false;
    let currentIntro = null;

    let insideSlide = false;
    let slideStartLine = 0;
    let slideClosed = false;
    let currentSlide = null;

    let hasIntro = false;
    let slideCount = 0;

    // Track non-slide four-colon directives (like ::::landing-cards-container, ::::my-custom-directive)
    // These are valid v2 syntax that exist alongside slideshow syntax
    // Must be properly opened and closed with matching :::: tags
    const fourColonDirectiveStack = [];

    // Track code block state inline to avoid O(n²) complexity
    // Store the fence character (` or ~) to ensure matching close
    let inCodeBlock = false;
    let codeBlockFence = null;  // Will be '`' or '~'
    let codeBlockFenceCount = 0;  // Number of fence characters (e.g., 3 for ```)

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        // Normalize space-after-colons for cards (align with exl-html-converter markdown-utils.ts).
        // Authors may write ":::: landing-cards-container" or "::: card"; treat as no space for matching.
        const directiveLine = trimmedLine
            .replace(/^(:{3,4})[ \t]+landing-cards-container([ \t]*)$/, '$1landing-cards-container')
            .replace(/^(:{3,4})[ \t]+card([ \t]*)$/, '$1card');

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

        // Skip slide syntax that is within HTML comments
        if (isSlidesSyntaxInComment(i, line, lines)) {
            continue;
        }

        // Skip slide syntax that is within code blocks
        if (inCodeBlock) {
            continue;
        }

        // Check for common spacing errors in slide directives
        if (/^::::\s+slides\b/.test(directiveLine)) {
            parseErrors.push({
                lineNumber: i + 1,
                detail: "Invalid spacing: use '::::slides' not ':::: slides' (no space between colons and directive)",
            });
        }
        if (/^:::\s+(?:intro|slide)\b/.test(directiveLine)) {
            parseErrors.push({
                lineNumber: i + 1,
                detail: "Invalid spacing: use ':::intro' or ':::slide' not '::: intro' or '::: slide' (no space between colons and directive)",
            });
        }

        // Check for any four-colon directive first (::::something)
        // This includes both ::::slides and other v2 directives like ::::landing-cards-container
        // Note: Using else-if chain ensures only one directive is processed per line
        // This is correct behavior: malformed lines with multiple directives (e.g., "::::slides ::::")
        // will only trigger the first match, preventing duplicate error reporting
        if (slidesRe.test(directiveLine)) {
            // This is a ::::slides directive - track it for slide validation
            if (slideshowActive) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: "Multiple ::::slides containers found - only one allowed per file",
                });
            }

            // Check for invalid trailing content after ::::slides
            // Allow attributes in curly braces like {.class} or {#id}
            const trailingContent = directiveLine.replace(/^::::slides\s*/i, '');
            if (trailingContent && !trailingContent.startsWith('{')) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: "Invalid trailing content after ::::slides directive (only whitespace or attributes allowed)",
                });
            }

            slideshowActive = true;
            slideshow.startLine = i + 1;
            slideshowClosed = false;

            // Add to container stack
            pushContainer('slideshow', i + 1);
        }
        // Check for other four-colon directives (not ::::slides)
        else if (fourColonDirectiveRe.test(directiveLine)) {
            // This is a non-slide directive like ::::landing-cards-container or ::::my-custom-directive

            // Four-colon directives should not be opened inside ::::slides containers
            // They should exist alongside (before or after) slideshows, not within them
            if (slideshowActive && !slideshowClosed) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: "Four-colon directives not allowed inside ::::slides container (should be outside)",
                });
            }

            // Check for invalid trailing content after directive name
            // Allow attributes in curly braces like {.class} or {#id}
            const directiveMatch = directiveLine.match(fourColonDirectiveRe);
            const directiveName = directiveMatch[0];
            const trailingContent = directiveLine.replace(new RegExp(`^${directiveName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), '');
            if (trailingContent && !trailingContent.startsWith('{')) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: `Invalid trailing content after ${directiveName} directive (only whitespace or attributes allowed)`,
                });
            }

            // Track it so we can properly match its closing ::::
            fourColonDirectiveStack.push({
                directive: directiveName,
                lineNumber: i + 1
            });
        }

        // Check for four-colon closing (::::)
        // This closes the most recently opened four-colon directive (proper LIFO stack behavior)
        // Could be closing ::::slides, ::::landing-cards-container, or other four-colon directives
        else if (slidesCloseRe.test(directiveLine)) {
            // Check if there are any non-slideshow four-colon directives to close first
            // This ensures proper nesting: inner directives must close before outer ones
            if (fourColonDirectiveStack.length > 0) {
                // Close the most recent non-slideshow four-colon directive
                const closedDirective = fourColonDirectiveStack.pop();
                // Successfully closed the directive (no further action needed)
                // Note: We could add debug logging here if needed
            } else if (slideshowActive) {
                // No other four-colon directives open, so this closes the ::::slides container
                const closeResult = closeContainer('slideshow', i + 1);

                if (closeResult.error) {
                    parseErrors.push({
                        lineNumber: i + 1,
                        detail: closeResult.error + (closeResult.openLine ? ` (opened at line ${closeResult.openLine})` : '')
                    });
                } else {
                    slideshowClosed = true;
                    slideshow.endLine = i + 1;

                    // Check for unclosed code block at slideshow close
                    if (inCodeBlock) {
                        parseErrors.push({
                            lineNumber: i + 1,
                            detail: "Unclosed code block found at slideshow end (missing closing fence before ::::)",
                        });
                    }

                    // Finalize current containers and check for unclosed nested containers
                    if (insideIntro && currentIntro) {
                        parseErrors.push({
                            lineNumber: introStartLine,
                            detail: ":::intro container not properly closed before ::::slides end",
                        });
                        // Force finalize intro
                        currentIntro.endLine = i;
                        slideshow.intro = currentIntro;
                    }
                    if (insideSlide && currentSlide) {
                        parseErrors.push({
                            lineNumber: slideStartLine,
                            detail: ":::slide container not properly closed before ::::slides end",
                        });
                        // Force finalize slide
                        currentSlide.endLine = i;
                        slideshow.slides.push(currentSlide);
                    }
                }
            } else {
                // No four-colon directives open and no slideshow active - this is a stray closing tag
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: "Found :::: closing tag without matching opening four-colon directive",
                });
            }
        }

        // Check for intro start
        else if (introOpenRe.test(directiveLine)) {
            if (!slideshowActive) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: ":::intro found outside of ::::slides container",
                });
            } else if (insideIntro) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: "Nested :::intro containers not allowed",
                });
            } else if (insideSlide) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: ":::intro cannot be inside :::slide container",
                });
            } else {
                insideIntro = true;
                introStartLine = i + 1;
                introClosed = false;
                hasIntro = true;

                // Add to container stack
                pushContainer('intro', i + 1);

                // Initialize intro object
                currentIntro = {
                    startLine: i + 1,
                    endLine: 0,
                    title: null,
                    lines: [],
                };
            }
        }

        // Check for slide start
        else if (slideOpenRe.test(directiveLine)) {
            if (!slideshowActive) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: ":::slide found outside of ::::slides container",
                });
            } else if (insideSlide) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: "Nested :::slide containers not allowed",
                });
            } else if (insideIntro) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: ":::slide cannot be inside :::intro container",
                });
            } else {
                insideSlide = true;
                slideStartLine = i + 1;
                slideClosed = false;
                slideCount++;

                // Add to container stack
                pushContainer('slide', i + 1);

                // Initialize slide object
                currentSlide = {
                    id: slideCount,
                    startLine: i + 1,
                    endLine: 0,
                    title: null,
                    lines: [],
                };
            }
        }

        // Check for container close (:::)
        else if (containerCloseRe.test(directiveLine)) {
            let closeResult = null;

            if (insideIntro) {
                closeResult = closeContainer('intro', i + 1);
                if (closeResult.success) {
                    if (currentIntro) {
                        currentIntro.endLine = i + 1;
                        slideshow.intro = currentIntro;
                    }
                    insideIntro = false;
                    introClosed = true;
                }
            } else if (insideSlide) {
                closeResult = closeContainer('slide', i + 1);
                if (closeResult.success) {
                    if (currentSlide) {
                        currentSlide.endLine = i + 1;
                        slideshow.slides.push(currentSlide);
                    }
                    insideSlide = false;
                    slideClosed = true;
                }
            } else if (slideshowActive) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: "Found ::: closing tag without matching opening container",
                });
            }

            if (closeResult && closeResult.error) {
                parseErrors.push({
                    lineNumber: i + 1,
                    detail: closeResult.error + (closeResult.openLine ? ` (opened at line ${closeResult.openLine})` : '')
                });
            }
        }

        // Parse content within containers
        else if (slideshowActive && (insideIntro || insideSlide)) {
            const currentContainer = insideIntro ? currentIntro : currentSlide;

            if (currentContainer && trimmedLine) {
                const lineData = {
                    lineNumber: i + 1,
                    text: line,
                    type: "text",
                    images: [],
                };

                // Check for headings
                const headingMatch = trimmedLine.match(headingRe);
                if (headingMatch) {
                    lineData.type = "heading";
                    lineData.headingText = headingMatch[1];
                    lineData.headingLevel = (trimmedLine.match(/^#+/) || [""])[0].length;

                    // Set container title to first heading found
                    if (!currentContainer.title) {
                        currentContainer.title = headingMatch[1];
                    }
                }

                // Check for images first
                let imageMatch;
                imageRe.lastIndex = 0; // Reset regex
                while ((imageMatch = imageRe.exec(trimmedLine)) !== null) {
                    lineData.images.push({
                        alt: imageMatch[1] || "",
                        src: imageMatch[2],
                        callouts: [],
                    });
                    if (lineData.type === "text") {
                        lineData.type = "image";
                    }
                }

                // Check for callouts and associate them with images
                const calloutMatch = trimmedLine.match(calloutRe);
                if (calloutMatch) {
                    const calloutText = calloutMatch[1];
                    const attributesString = calloutMatch[2];

                    // Parse callout attributes into an object
                    const attributes = {};
                    const attrMatches = attributesString.matchAll(/(\w+)=([^}\s]+)/g);
                    for (const attrMatch of attrMatches) {
                        const key = attrMatch[1];
                        let value = attrMatch[2];

                        // Try to convert numeric values
                        if (/^\d+(\.\d+)?$/.test(value)) {
                            value = parseFloat(value);
                        }

                        attributes[key] = value;
                    }

                    const calloutData = {
                        lineNumber: lineData.lineNumber,
                        text: calloutText,
                        attributes: attributes,
                        rawAttributes: attributesString,
                    };

                    slideshow.callouts.push(calloutData);

                    // If there's an image on this line, associate the callout with it
                    if (lineData.images.length > 0) {
                        // Associate with the last image found on this line
                        lineData.images[lineData.images.length - 1].callouts.push(
                            calloutData,
                        );
                    } else {
                        // If no image on this line, look for the most recent image in previous lines
                        let associatedWithImage = false;
                        for (let j = currentContainer.lines.length - 1; j >= 0; j--) {
                            const prevLine = currentContainer.lines[j];
                            if (prevLine.images && prevLine.images.length > 0) {
                                // Associate with the last image found
                                const lastImage = prevLine.images[prevLine.images.length - 1];
                                lastImage.callouts.push(calloutData);
                                associatedWithImage = true;
                                break;
                            }
                        }

                        // If no previous image found, create a standalone callout line
                        if (!associatedWithImage) {
                            lineData.standaloneCallouts = [calloutData];
                        }
                    }

                    if (lineData.type === "text") {
                        lineData.type = "callout";
                    }
                }

                // Add the line data to the container
                currentContainer.lines.push(lineData);
            }
        }

        // Check for content outside containers within slideshow
        else if (
            slideshowActive &&
            !slideshowClosed &&
            !insideIntro &&
            !insideSlide &&
            trimmedLine &&
            !trimmedLine.startsWith("---") &&
            !isPositionInComment(i, 0, lines) // Ignore content within HTML comments
        ) {
            // Allow empty lines and frontmatter, but not other content
            parseErrors.push({
                lineNumber: i + 1,
                detail:
                "Content found outside of :::intro or :::slide containers within ::::slides",
            });
        }
    }

    // Check for any unclosed containers at end of file
    if (containerStack.length > 0) {
        containerStack.forEach(container => {
            if (!container.closed) {
                parseErrors.push({
                    lineNumber: container.openLine,
                    detail: `Unclosed ${container.type} container (opened at line ${container.openLine})`,
                });
            }
        });
    }

    // Check for any unclosed four-colon directives at end of file
    if (fourColonDirectiveStack.length > 0) {
        fourColonDirectiveStack.forEach(directive => {
            parseErrors.push({
                lineNumber: directive.lineNumber,
                detail: `Unclosed four-colon directive ${directive.directive} (opened at line ${directive.lineNumber}, missing closing ::::)`,
            });
        });
    }

    // Final validation checks
    if (slideshowActive && !slideshowClosed) {
        parseErrors.push({
            lineNumber: slideshow.startLine,
            detail: "::::slides container not properly closed",
        });
    }

    // Check for unclosed code blocks within slideshow
    if (slideshowActive && inCodeBlock) {
        parseErrors.push({
            lineNumber: slideshow.startLine,
            detail: "Unclosed code block found within slideshow (missing closing fence)",
        });
    }

    if (insideIntro && !introClosed) {
        parseErrors.push({
            lineNumber: introStartLine,
            detail: ":::intro container not properly closed",
        });
    }

    if (insideSlide && !slideClosed) {
        parseErrors.push({
            lineNumber: slideStartLine,
            detail: ":::slide container not properly closed",
        });
    }

    // Add computed properties
    slideshow.slideshowActive = slideshowActive;
    slideshow.slideshowClosed = slideshowClosed;
    slideshow.hasIntro = hasIntro;
    slideshow.slideCount = slideCount;

    // Cache the result
    slideshowCache.set(cacheKey, slideshow);

    return slideshow;
}

/**
 * Clear the cache (useful for testing or when files change)
 */
export function clearSlideshowCache() {
    slideshowCache.clear();
}

/**
 * Get cached slideshow data without parsing (returns null if not cached)
 */
export function getCachedSlideshow(filename) {
    return slideshowCache.get(filename) || null;
}
