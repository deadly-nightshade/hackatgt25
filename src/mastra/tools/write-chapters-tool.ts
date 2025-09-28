import { z } from 'zod';

// Helper function to get content for specific file indices (from analyze-relationships-tool)
function getContentForIndices(filesData: Array<[string, string]>, indices: number[]): Record<string, string> {
    const contentMap: Record<string, string> = {};
    for (const i of indices) {
        if (i >= 0 && i < filesData.length) {
            const [path, content] = filesData[i];
            contentMap[`${i} # ${path}`] = content;
        }
    }
    return contentMap;
}

// Input schema for writing chapters
export const WriteChaptersInputSchema = z.object({
    chapterOrder: z.array(z.number()),
    abstractions: z.array(z.object({
        name: z.string(),
        description: z.string(),
        files: z.array(z.number()),
    })),
    filesData: z.array(z.tuple([z.string(), z.string()])),
    projectName: z.string(),
    language: z.string().default('english'),
    useCache: z.boolean().default(true),
});

// Input schema for single chapter
export const SingleChapterInputSchema = z.object({
    chapterNum: z.number(),
    abstractionIndex: z.number(),
    abstractionDetails: z.object({
        name: z.string(),
        description: z.string(),
        files: z.array(z.number()),
    }),
    relatedFilesContentMap: z.record(z.string()),
    projectName: z.string(),
    fullChapterListing: z.string(),
    chapterFilenames: z.record(z.object({
        num: z.number(),
        name: z.string(),
        filename: z.string(),
    })),
    prevChapter: z.object({
        num: z.number(),
        name: z.string(),
        filename: z.string(),
    }).nullable(),
    nextChapter: z.object({
        num: z.number(),
        name: z.string(),
        filename: z.string(),
    }).nullable(),
    previousChaptersSummary: z.string(),
    projectSummary: z.string().optional(),
    language: z.string().default('english'),
    useCache: z.boolean().default(true),
});

// Output schemas
export const WriteChaptersOutputSchema = z.object({
    chapters: z.array(z.string()), // Markdown content for each chapter
});

export const SingleChapterOutputSchema = z.object({
    chapterContent: z.string(), // Markdown content
});

export type WriteChaptersInput = z.infer<typeof WriteChaptersInputSchema>;
export type SingleChapterInput = z.infer<typeof SingleChapterInputSchema>;
export type WriteChaptersOutput = z.infer<typeof WriteChaptersOutputSchema>;
export type SingleChapterOutput = z.infer<typeof SingleChapterOutputSchema>;

/**
 * Prepares the data for writing all chapters, replicating the Python prep method
 */
export function prepareChaptersData(input: WriteChaptersInput) {
    const { chapterOrder, abstractions, filesData, projectName } = input;
    
    // Create complete list of all chapters
    const allChapters: string[] = [];
    const chapterFilenames: Record<number, { num: number; name: string; filename: string }> = {};
    
    for (let i = 0; i < chapterOrder.length; i++) {
        const abstractionIndex = chapterOrder[i];
        if (abstractionIndex >= 0 && abstractionIndex < abstractions.length) {
            const chapterNum = i + 1;
            const chapterName = abstractions[abstractionIndex].name;
            
            // Create safe filename
            const safeName = chapterName
                .replace(/[^a-zA-Z0-9]/g, '_')
                .toLowerCase();
            const filename = `${chapterNum.toString().padStart(2, '0')}_${safeName}.md`;
            
            // Format with link
            allChapters.push(`${chapterNum}. [${chapterName}](${filename})`);
            
            // Store mapping
            chapterFilenames[abstractionIndex] = {
                num: chapterNum,
                name: chapterName,
                filename: filename,
            };
        }
    }
    
    const fullChapterListing = allChapters.join('\n');
    
    // Prepare items to process
    const itemsToProcess: SingleChapterInput[] = [];
    
    for (let i = 0; i < chapterOrder.length; i++) {
        const abstractionIndex = chapterOrder[i];
        if (abstractionIndex >= 0 && abstractionIndex < abstractions.length) {
            const abstractionDetails = abstractions[abstractionIndex];
            const relatedFileIndices = abstractionDetails.files || [];
            const relatedFilesContentMap = getContentForIndices(filesData, relatedFileIndices);
            
            // Get previous chapter info
            const prevChapter = i > 0 ? chapterFilenames[chapterOrder[i - 1]] : null;
            
            // Get next chapter info
            const nextChapter = i < chapterOrder.length - 1 ? chapterFilenames[chapterOrder[i + 1]] : null;
            
            // Build a small project summary (concise) to provide to every chapter prompt
            const projectSummary = abstractions.map((a, idx) => `- ${a.name}: ${a.description}`).join('\n');

            itemsToProcess.push({
                chapterNum: i + 1,
                abstractionIndex: abstractionIndex,
                abstractionDetails: abstractionDetails,
                relatedFilesContentMap: relatedFilesContentMap,
                projectName: projectName,
                projectSummary: projectSummary,
                fullChapterListing: fullChapterListing,
                chapterFilenames: chapterFilenames,
                prevChapter: prevChapter,
                nextChapter: nextChapter,
                previousChaptersSummary: "", // Will be built progressively
                language: input.language,
                useCache: input.useCache,
            });
        }
    }
    
    return itemsToProcess;
}

/**
 * Prepares the prompt for writing a single chapter, replicating the Python exec method
 */
export function prepareSingleChapterPrompt(item: SingleChapterInput): string {
    const { 
        chapterNum, 
        abstractionDetails, 
        projectName, 
        language, 
        fullChapterListing,
        relatedFilesContentMap,
        previousChaptersSummary,
        prevChapter,
        nextChapter 
    } = item;
    
    const abstractionName = abstractionDetails.name;
    const abstractionDescription = abstractionDetails.description;
    
    // Prepare file context string
    const fileContextStr = Object.entries(relatedFilesContentMap)
        .map(([idxPath, content]) => {
            const fileName = idxPath.includes('# ') ? idxPath.split('# ')[1] : idxPath;
            return `--- File: ${fileName} ---\n${content}`;
        })
        .join('\n\n');
    
    // Add language instruction and context notes only if not English
    let languageInstruction = "";
    let conceptDetailsNote = "";
    let structureNote = "";
    let prevSummaryNote = "";
    let instructionLangNote = "";
    let mermaidLangNote = "";
    let codeCommentNote = "";
    let linkLangNote = "";
    let toneNote = "";
    
    if (language.toLowerCase() !== "english") {
        const langCap = language.charAt(0).toUpperCase() + language.slice(1);
        languageInstruction = `IMPORTANT: Write this ENTIRE tutorial chapter in **${langCap}**. Some input context (like concept name, description, chapter list, previous summary) might already be in ${langCap}, but you MUST translate ALL other generated content including explanations, examples, technical terms, and potentially code comments into ${langCap}. DO NOT use English anywhere except in code syntax, required proper nouns, or when specified. The entire output MUST be in ${langCap}.\n\n`;
        conceptDetailsNote = ` (Note: Provided in ${langCap})`;
        structureNote = ` (Note: Chapter names might be in ${langCap})`;
        prevSummaryNote = ` (Note: This summary might be in ${langCap})`;
        instructionLangNote = ` (in ${langCap})`;
        mermaidLangNote = ` (Use ${langCap} for labels/text if appropriate)`;
        codeCommentNote = ` (Translate to ${langCap} if possible, otherwise keep minimal English for clarity)`;
        linkLangNote = ` (Use the ${langCap} chapter title from the structure above)`;
        toneNote = ` (appropriate for ${langCap} readers)`;
    }
    
    const prompt = `
${languageInstruction}Write a very beginner-friendly tutorial chapter (in Markdown format) for the project \`${projectName}\` about the concept: "${abstractionName}". This is Chapter ${chapterNum}.

Project Summary (give this to the reader before the chapter):
${item.projectSummary || projectName}

Concept Details${conceptDetailsNote}:
- Name: ${abstractionName}
- Description:
${abstractionDescription}

Complete Tutorial Structure${structureNote}:
${fullChapterListing}

Context from previous chapters${prevSummaryNote}:
${previousChaptersSummary || "This is the first chapter."}

Relevant Code Snippets (Code itself remains unchanged):
${fileContextStr || "No specific code snippets provided for this abstraction."}

Instructions for the chapter (Generate content in ${language.charAt(0).toUpperCase() + language.slice(1)} unless specified otherwise):
- Start with a clear heading (e.g., \`# Chapter ${chapterNum}: ${abstractionName}\`). Use the provided concept name.

- If this is not the first chapter, begin with a brief transition from the previous chapter${instructionLangNote}, referencing it with a proper Markdown link using its name${linkLangNote}.

- Begin with a high-level motivation explaining what problem this abstraction solves${instructionLangNote}. Start with a central use case as a concrete example. The whole chapter should guide the reader to understand how to solve this use case. Make it very minimal and friendly to beginners.

- If the abstraction is complex, break it down into key concepts. Explain each concept one-by-one in a very beginner-friendly way${instructionLangNote}.

- Explain how to use this abstraction to solve the use case${instructionLangNote}. Give example inputs and outputs for code snippets (if the output isn't values, describe at a high level what will happen${instructionLangNote}).

- Each code block should be BELOW 10 lines! If longer code blocks are needed, break them down into smaller pieces and walk through them one-by-one. Aggressively simplify the code to make it minimal. Use comments${codeCommentNote} to skip non-important implementation details. Each code block should have a beginner friendly explanation right after it${instructionLangNote}.

- Describe the internal implementation to help understand what's under the hood${instructionLangNote}. First provide a non-code or code-light walkthrough on what happens step-by-step when the abstraction is called${instructionLangNote}. It's recommended to use a simple sequenceDiagram with a dummy example - keep it minimal with at most 5 participants to ensure clarity. If participant name has space, use: \`participant QP as Query Processing\`. ${mermaidLangNote}.

- Then dive deeper into code for the internal implementation with references to files. Provide example code blocks, but make them similarly simple and beginner-friendly. Explain${instructionLangNote}.

- IMPORTANT: When you need to refer to other core abstractions covered in other chapters, ALWAYS use proper Markdown links like this: [Chapter Title](filename.md). Use the Complete Tutorial Structure above to find the correct filename and the chapter title${linkLangNote}. Translate the surrounding text.

- Use mermaid diagrams to illustrate complex concepts (\`\`\`mermaid\`\`\` format). ${mermaidLangNote}.

- Heavily use analogies and examples throughout${instructionLangNote} to help beginners understand.

- End the chapter with a brief conclusion that summarizes what was learned${instructionLangNote} and provides a transition to the next chapter${instructionLangNote}. If there is a next chapter, use a proper Markdown link: [Next Chapter Title](next_chapter_filename)${linkLangNote}.

- Ensure the tone is welcoming and easy for a newcomer to understand${toneNote}.

- Output *only* the Markdown content for this chapter.

Now, directly provide a super beginner-friendly Markdown output (DON'T need \`\`\`markdown\`\`\` tags):
`;
    
    return prompt;
}

/**
 * Validates and cleans up the chapter content
 */
export function validateChapterContent(
    chapterContent: string, 
    chapterNum: number, 
    abstractionName: string
): string {
    // First clean up common LLM escaping issues (e.g., "\# Chapter...", escaped links, or escaped mermaid)
    chapterContent = cleanLLMOutput(chapterContent);

    // Remove any leading whitespace/indentation before headings that LLMs sometimes add
    chapterContent = chapterContent.replace(/^[ \t]+(?=#\s*Chapter)/gm, '');

    const actualHeading = `# Chapter ${chapterNum}: ${abstractionName}`;

    if (!chapterContent.trim().startsWith(`# Chapter ${chapterNum}`)) {
        // Add heading if missing or incorrect
        const lines = chapterContent.trim().split('\n');
        if (lines && lines[0].trim().startsWith('#')) {
            // Replace existing heading
            lines[0] = actualHeading;
            chapterContent = lines.join('\n');
        } else {
            // Prepend heading
            chapterContent = `${actualHeading}\n\n${chapterContent}`;
        }
    }

    return chapterContent;
}

/**
 * Clean typical LLM output issues:
 * - Remove stray backslashes before Markdown headings (e.g. "\# Chapter...")
 * - Unescape bracketed links/parentheses outside code fences
 * - Normalize and unescape mermaid blocks (remove accidental backslashes inside mermaid)
 * - Preserve non-mermaid code fences as-is
 */
function cleanLLMOutput(content: string): string {
    if (!content) return content;

    const lines = content.split('\n');
    const out: string[] = [];
    let inFence = false;
    let fenceLang = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Normalize fence lines that may have been escaped (e.g. "\`\`\`mermaid") by stripping leading backslashes
        const strippedLeading = line.replace(/^(\s*)\\+/, '$1');

        const fenceStartMatch = strippedLeading.match(/^\s*```(\w*)/);
        if (!inFence && fenceStartMatch) {
            inFence = true;
            fenceLang = (fenceStartMatch[1] || '').toLowerCase();
            // push normalized fence line (remove any stray leading backslashes)
            out.push(strippedLeading);
            continue;
        }

        // Detect fence end (also normalize)
        if (inFence && /^\s*```/.test(strippedLeading)) {
            inFence = false;
            fenceLang = '';
            out.push(strippedLeading);
            continue;
        }

        if (inFence) {
            if (fenceLang === 'mermaid') {
                // Mermaid blocks should not contain backslash-escapes inserted by LLMs.
                // Remove backslashes but preserve normal characters.
                out.push(line.replace(/\\+/g, ''));
            } else {
                // Non-mermaid code blocks: leave content untouched
                out.push(line);
            }
            continue;
        }

        // Outside fenced blocks: fix common escaped characters that break Markdown rendering
        // 1) Leading escaped hashes for headings: "\#" -> "#"
        line = line.replace(/^(\s*)\\+(#+\s*)/, '$1$2');

        // 2) Remove backslashes before brackets and parentheses used in links: "\[Title\](file.md)" -> "[Title](file.md)"
        line = line.replace(/\\([\[\]()/])/g, '$1');

        // 3) Unescape some other common markdown punctuation outside code: `* _ >`
        line = line.replace(/\\([*_`>])/g, '$1');

        out.push(line);
    }

    return out.join('\n');
}