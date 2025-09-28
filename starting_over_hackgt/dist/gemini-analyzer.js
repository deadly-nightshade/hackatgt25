"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiCodeAnalyzer = void 0;
const generative_ai_1 = require("@google/generative-ai");
class GeminiCodeAnalyzer {
    constructor(apiKey) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
    /**
     * Check if a file should be analyzed based on its extension
     */
    shouldAnalyzeFile(filename) {
        const includeExtensions = [
            '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.h',
            '.cs', '.php', '.rb', '.go', '.rs', '.kt', '.swift', '.scala',
            '.html', '.css', '.scss', '.vue', '.svelte', '.json', '.md'
        ];
        const excludePatterns = [
            'node_modules/', 'dist/', 'build/', '.git/', 'test/', 'tests/',
            '__tests__/', '*.test.', '*.spec.', '.min.js', '.min.css'
        ];
        // Check if file should be excluded
        if (excludePatterns.some(pattern => filename.includes(pattern))) {
            return false;
        }
        // Check if file has an included extension or is a special file
        const specialFiles = ['package.json', 'tsconfig.json', 'README.md', 'dockerfile'];
        const hasIncludedExtension = includeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
        const isSpecialFile = specialFiles.some(special => filename.toLowerCase().includes(special.toLowerCase()));
        return hasIncludedExtension || isSpecialFile;
    }
    /**
     * Extract files that should be analyzed from the file structure
     */
    extractAnalyzableFiles(structure) {
        const files = [];
        const processNode = (node) => {
            if (node.type === 'file' && node.content && this.shouldAnalyzeFile(node.path)) {
                files.push({
                    path: node.path,
                    content: node.content
                });
            }
            else if (node.type === 'dir' && node.children) {
                node.children.forEach(processNode);
            }
        };
        structure.forEach(processNode);
        return files;
    }
    /**
     * Create the analysis prompt for Gemini
     */
    createAnalysisPrompt(files) {
        let prompt = `
**Filter Important Files**
   INCLUDE: .js, .ts, .tsx, .jsx, .py, .java, .cpp, .c, .h, .cs, .php, .rb, .go, .rs, .kt, .swift, .scala, .html, .css, .scss, .vue, .svelte, package.json, tsconfig.json, README.md, etc.
   EXCLUDE: Binary files, images, node_modules/, dist/, build/, .git/, test files (unless requested)

You are an expert code analyzer that extracts detailed structural information from source code and returns it in a nested JSON format.

You will be given:
a filename
the full code content of that file

Your task:
Figure out what language the code is written in based on file extension
Analyze the code according to the language's conventions and syntax
Output a single JSON object with the following keys:
"file": string, the filename
"summary": string, one short paragraph (2–4 sentences) summarizing what the code roughly does
"imports": array of strings, all external or standard library imports
"functions": array of objects for all top-level functions (not inside classes), each with:{"name": string,"signature": string,"description": string}
"classes": array of objects for all classes, each with:{"name": string,"description": string,"functions": [{"name": string,"signature": string,"description": string}]}

Your task is to analyze code files and extract ALL features in a comprehensive, nested JSON structure. An example format is:

{
    title: "GitGood",
    file: "main.py",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    imports: ["os", "re", "yaml"],
    functions: [
      {
        name: "get_content_for_indices",
        signature: "get_content_for_indices(files_data, indices)",
        description: "Gets code snippets based on indices.",
      },
    ],
    classes: [
      { name: "aaasdfjsf(Node)", popupFunctionNames: ["prep(self, shared)", "run(self)"] , nestedExplanation: "explanation for asdfj" } as any,
      { name: "asdfasdf(Node)", popupFunctionNames: ["prep(self, shared)"] , description: "Identifies abstractions." } as any,
      { name: "lskdfjlkjsf(Node)", popupFunctionNames: ["exec(self, prep_res)", "analyze(self)"] , nestedClass: "prep(self, shared)", nestedExplanation: "explanation for yippee" } as any,
    ],

Analyze the provided code thoroughly and return the complete feature extraction as JSON.

Here are the files to analyze:

`;
        // Add each file's content to the prompt
        files.forEach((file, index) => {
            prompt += `\n**FILE ${index + 1}: ${file.path}**\n\`\`\`\n${file.content}\n\`\`\`\n`;
        });
        return prompt;
    }
    /**
     * Analyze code structure using Gemini AI
     */
    async analyzeCodeStructure(structure) {
        console.log('Extracting files for AI analysis...');
        const analyzableFiles = this.extractAnalyzableFiles(structure);
        if (analyzableFiles.length === 0) {
            console.log('No analyzable files found.');
            return {};
        }
        console.log(`Found ${analyzableFiles.length} files to analyze:`);
        analyzableFiles.forEach(file => console.log(`- ${file.path}`));
        console.log('Sending files to Gemini for analysis...');
        try {
            const prompt = this.createAnalysisPrompt(analyzableFiles);
            // Split into chunks if the prompt is too long
            const maxPromptLength = 30000; // Conservative limit for Gemini
            if (prompt.length > maxPromptLength) {
                console.log(`Prompt is too long (${prompt.length} chars), splitting into chunks...`);
                return await this.analyzeInChunks(analyzableFiles);
            }
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Try to extract JSON from the response
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[1]);
                }
                catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                    console.log('Raw response:', text);
                    return { error: 'Failed to parse AI response as JSON', raw_response: text };
                }
            }
            else {
                // Try to parse the entire response as JSON
                try {
                    return JSON.parse(text);
                }
                catch (parseError) {
                    console.error('No JSON found in response:', text);
                    return { error: 'No valid JSON found in AI response', raw_response: text };
                }
            }
        }
        catch (error) {
            console.error('Error calling Gemini API:', error);
            return { error: error.message || 'Failed to analyze code with AI' };
        }
    }
    /**
     * Analyze files in smaller chunks if the prompt is too long
     */
    async analyzeInChunks(files) {
        const chunkSize = 5; // Analyze 5 files at a time
        const results = {};
        for (let i = 0; i < files.length; i += chunkSize) {
            const chunk = files.slice(i, i + chunkSize);
            console.log(`Analyzing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(files.length / chunkSize)}...`);
            const prompt = this.createAnalysisPrompt(chunk);
            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/);
                if (jsonMatch) {
                    const chunkResults = JSON.parse(jsonMatch[1]);
                    Object.assign(results, chunkResults);
                }
                else {
                    const chunkResults = JSON.parse(text);
                    Object.assign(results, chunkResults);
                }
            }
            catch (error) {
                console.error(`Error analyzing chunk ${Math.floor(i / chunkSize) + 1}:`, error);
                results[`chunk_${Math.floor(i / chunkSize) + 1}_error`] = {
                    error: error.message || 'Failed to analyze chunk',
                    files: chunk.map(f => f.path)
                };
            }
            // Add a small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return results;
    }
    /**
     * Create the abstraction analysis prompt for Gemini
     */
    createAbstractionPrompt(files, maxAbstractionNum = 7) {
        let prompt = `You are an expert at analyzing codebases and identifying core abstractions.
Your task is to identify the most important abstractions in a codebase (up to ${maxAbstractionNum}).

For each abstraction, provide:
1. A concise name (DO NOT append language tags like {javascript}, {python}, {typescript} — produce a plain name only)
2. A clear description with a simple analogy
3. A category classification
4. A list of relevant file indices

Format the output EXACTLY as this json template:

{
  "abstractions": [
    {
      "name": "AbstractionName",
      "description": "Explains what the abstraction does. It's like <analogy to help understand>.",
      "category": "class|interface|pattern|component|service",
      "file_indices": [0, 3]
    }
  ]
}

For example:
{
  "abstractions": [
    {
      "name": "QueryProcessor",
      "description": "Handles parsing and processing of user queries. It's like a mail sorting room that directs letters to the right department.",
      "category": "service",
      "file_indices": [0, 3]
    }
  ]
}

Focus on identifying high-level patterns and concepts that would help newcomers understand the system.
Do NOT append language hints or braces (e.g., {javascript}) to names or descriptions; keep names and descriptions plain.

Here are the files to analyze (with their indices):

`;
        // Add each file's content to the prompt with index
        files.forEach((file, index) => {
            prompt += `\n**FILE ${index}: ${file.path}**\n\`\`\`\n${file.content}\n\`\`\`\n`;
        });
        return prompt;
    }
    /**
     * Analyze code abstractions using Gemini AI
     */
    async analyzeAbstractions(structure, maxAbstractionNum = 7) {
        console.log('Extracting files for abstraction analysis...');
        const analyzableFiles = this.extractAnalyzableFiles(structure);
        if (analyzableFiles.length === 0) {
            console.log('No analyzable files found for abstraction analysis.');
            return { abstractions: [] };
        }
        console.log(`Found ${analyzableFiles.length} files to analyze for abstractions:`);
        analyzableFiles.forEach(file => console.log(`- ${file.path}`));
        console.log('Sending files to Gemini for abstraction analysis...');
        try {
            const prompt = this.createAbstractionPrompt(analyzableFiles, maxAbstractionNum);
            // Split into chunks if the prompt is too long
            const maxPromptLength = 30000; // Conservative limit for Gemini
            if (prompt.length > maxPromptLength) {
                console.log(`Prompt is too long (${prompt.length} chars), analyzing with limited files...`);
                // Take the first few files to fit within the limit
                const limitedFiles = analyzableFiles.slice(0, 5);
                const limitedPrompt = this.createAbstractionPrompt(limitedFiles, maxAbstractionNum);
                return await this.processAbstractionPrompt(limitedPrompt);
            }
            return await this.processAbstractionPrompt(prompt);
        }
        catch (error) {
            console.error('Error calling Gemini API for abstraction analysis:', error);
            return {
                abstractions: [],
                error: error.message || 'Failed to analyze abstractions with AI'
            };
        }
    }
    /**
     * Process the abstraction prompt and return parsed results
     */
    async processAbstractionPrompt(prompt) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Try to extract JSON from the response
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                return parsed;
            }
            catch (parseError) {
                console.error('Failed to parse JSON response for abstractions:', parseError);
                console.log('Raw response:', text);
                return {
                    abstractions: [],
                    error: 'Failed to parse AI response as JSON',
                    raw_response: text
                };
            }
        }
        else {
            // Try to parse the entire response as JSON
            try {
                return JSON.parse(text);
            }
            catch (parseError) {
                console.error('No JSON found in abstraction response:', text);
                return {
                    abstractions: [],
                    error: 'No valid JSON found in AI response',
                    raw_response: text
                };
            }
        }
    }
    /**
     * Helper function to get content for specific file indices
     */
    getContentForIndices(files, indices) {
        const result = {};
        for (const idx of indices) {
            if (idx >= 0 && idx < files.length) {
                const file = files[idx];
                result[`${idx}: ${file.path}`] = file.content;
            }
        }
        return result;
    }
    /**
     * Create the relationship analysis prompt for Gemini
     */
    createRelationshipPrompt(abstractions, files, projectName = "Repository") {
        // Create context with abstraction names, indices, descriptions, and relevant file snippets
        let context = "Identified Abstractions:\n";
        const allRelevantIndices = new Set();
        const abstractionInfoForPrompt = [];
        for (let i = 0; i < abstractions.length; i++) {
            const abstr = abstractions[i];
            const fileIndicesStr = abstr.file_indices.join(", ");
            const infoLine = `- Index ${i}: ${abstr.name} (Relevant file indices: [${fileIndicesStr}])\n  Description: ${abstr.description}`;
            context += infoLine + "\n";
            abstractionInfoForPrompt.push(`${i} # ${abstr.name}`);
            abstr.file_indices.forEach(idx => allRelevantIndices.add(idx));
        }
        context += "\nRelevant File Snippets (Referenced by Index and Path):\n";
        // Get content for relevant files
        const relevantFilesContentMap = this.getContentForIndices(files, Array.from(allRelevantIndices).sort());
        // Format file content for context
        const fileContextStr = Object.entries(relevantFilesContentMap)
            .map(([idxPath, content]) => `--- File: ${idxPath} ---\n${content}`)
            .join("\n\n");
        context += fileContextStr;
        const abstractionListing = abstractionInfoForPrompt.join("\n");
        const prompt = `
Based on the following abstractions and relevant code snippets from the project \`${projectName}\`:

List of Abstraction Indices and Names:
${abstractionListing}

Context (Abstractions, Descriptions, Code):
${context}

Please provide:
1. A high-level \`summary\` of the project's main purpose and functionality in a few beginner-friendly sentences. Use markdown formatting with **bold** and *italic* text to highlight important concepts.
2. A list (\`relationships\`) describing the key interactions between these abstractions. For each relationship, specify:
    - \`from\`: Index of the source abstraction (e.g., \`0\`)
    - \`to\`: Index of the target abstraction (e.g., \`1\`)
    - \`label\`: A brief label for the interaction **in just a few words** (e.g., "Manages", "Inherits", "Uses").
    Ideally the relationship should be backed by one abstraction calling or passing parameters to another.
    Simplify the relationship and exclude those non-important ones.

IMPORTANT: Make sure EVERY abstraction is involved in at least ONE relationship (either as source or target). Each abstraction index must appear at least once across all relationships.

**IMPORTANT: Please respond with a JSON object in this exact format:**

\`\`\`json
{
  "summary": "A brief, simple explanation of the project. Can span multiple sentences with **bold** and *italic* for emphasis.",
  "relationships": [
    {
      "from": 0,
      "to": 1,
      "label": "Manages"
    },
    {
      "from": 2,
      "to": 0,
      "label": "Provides config"
    }
  ]
}
\`\`\`

Now, provide the JSON output:
`;
        return prompt;
    }
    /**
     * Analyze relationships between abstractions using Gemini AI
     */
    async analyzeRelationships(abstractionAnalysis, structure) {
        console.log('Starting relationship analysis...');
        if (!abstractionAnalysis.abstractions || abstractionAnalysis.abstractions.length === 0) {
            console.log('No abstractions found for relationship analysis.');
            return {
                summary: "No abstractions available for relationship analysis.",
                relationships: []
            };
        }
        const analyzableFiles = this.extractAnalyzableFiles(structure);
        if (analyzableFiles.length === 0) {
            console.log('No analyzable files found for relationship analysis.');
            return {
                summary: "No files available for relationship analysis.",
                relationships: []
            };
        }
        console.log(`Analyzing relationships between ${abstractionAnalysis.abstractions.length} abstractions...`);
        abstractionAnalysis.abstractions.forEach((abstraction, index) => {
            console.log(`${index}. ${abstraction.name} (${abstraction.category})`);
        });
        try {
            const prompt = this.createRelationshipPrompt(abstractionAnalysis.abstractions, analyzableFiles, "Repository");
            // Split into chunks if the prompt is too long
            const maxPromptLength = 25000; // Conservative limit for Gemini
            if (prompt.length > maxPromptLength) {
                console.log(`Prompt is too long (${prompt.length} chars), using limited context...`);
                // Create a simplified prompt with fewer file contents
                const limitedFiles = analyzableFiles.slice(0, 3);
                const simplifiedPrompt = this.createRelationshipPrompt(abstractionAnalysis.abstractions, limitedFiles, "Repository");
                return await this.processRelationshipPrompt(simplifiedPrompt, abstractionAnalysis.abstractions.length);
            }
            return await this.processRelationshipPrompt(prompt, abstractionAnalysis.abstractions.length);
        }
        catch (error) {
            console.error('Error calling Gemini API for relationship analysis:', error);
            return {
                summary: "Failed to analyze relationships.",
                relationships: [],
                error: error.message || 'Failed to analyze relationships with AI'
            };
        }
    }
    /**
     * Process the relationship prompt and return parsed results
     */
    async processRelationshipPrompt(prompt, numAbstractions) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("=== Raw LLM Response ===");
        console.log(text);
        console.log("========================");
        // Extract JSON from response - try multiple patterns
        let jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/);
        if (!jsonMatch) {
            // Try without code blocks
            jsonMatch = text.match(/\{[\s\S]*"summary"[\s\S]*\}/);
            if (jsonMatch) {
                jsonMatch[1] = jsonMatch[0];
            }
        }
        if (!jsonMatch) {
            console.error("No JSON block found in response");
            return {
                summary: "Failed to extract JSON from response.",
                relationships: [],
                error: 'No JSON block found in response',
                raw_response: text
            };
        }
        console.log("=== Extracted JSON ===");
        console.log(jsonMatch[1]);
        console.log("======================");
        try {
            const relationshipsData = JSON.parse(jsonMatch[1]);
            console.log("=== Parsed JSON Data ===");
            console.log(JSON.stringify(relationshipsData, null, 2));
            console.log("========================");
            // Validate the parsed data
            if (!relationshipsData || typeof relationshipsData !== 'object') {
                throw new Error("LLM output is not a valid object");
            }
            if (!relationshipsData.summary || typeof relationshipsData.summary !== 'string') {
                throw new Error("Missing or invalid 'summary' field");
            }
            if (!relationshipsData.relationships || !Array.isArray(relationshipsData.relationships)) {
                throw new Error("Missing or invalid 'relationships' field");
            }
            // Validate and clean relationships
            const validatedRelationships = [];
            for (const rel of relationshipsData.relationships) {
                if (!rel || typeof rel !== 'object') {
                    console.warn(`Skipping invalid relationship item: ${JSON.stringify(rel)}`);
                    continue;
                }
                if (rel.from === undefined || rel.to === undefined || !rel.label) {
                    console.warn(`Missing keys in relationship item: ${JSON.stringify(rel)}`);
                    continue;
                }
                if (typeof rel.label !== 'string') {
                    console.warn(`Relationship label is not a string: ${JSON.stringify(rel)}`);
                    continue;
                }
                // Validate indices
                const fromIdx = parseInt(String(rel.from));
                const toIdx = parseInt(String(rel.to));
                if (fromIdx < 0 || fromIdx >= numAbstractions || toIdx < 0 || toIdx >= numAbstractions) {
                    console.warn(`Invalid index in relationship: from=${fromIdx}, to=${toIdx}. Max index is ${numAbstractions - 1}.`);
                    continue;
                }
                validatedRelationships.push({
                    from: fromIdx,
                    to: toIdx,
                    label: rel.label,
                });
            }
            console.log("=== Validated Relationships ===");
            console.log(JSON.stringify(validatedRelationships, null, 2));
            console.log("===============================");
            return {
                summary: relationshipsData.summary,
                relationships: validatedRelationships,
            };
        }
        catch (parseError) {
            console.error('Failed to parse JSON response for relationships:', parseError);
            console.log('Raw response:', text);
            return {
                summary: "Failed to parse relationship analysis.",
                relationships: [],
                error: 'Failed to parse AI response as JSON',
                raw_response: text
            };
        }
    }
    /**
     * Create the chapter ordering prompt for Gemini
     */
    createChapterOrderPrompt(abstractions, relationshipAnalysis, projectName = "Repository") {
        // Prepare abstraction info for prompt
        const abstractionInfoForPrompt = [];
        for (let i = 0; i < abstractions.length; i++) {
            const abstraction = abstractions[i];
            abstractionInfoForPrompt.push(`- ${i} # ${abstraction.name}`);
        }
        const abstractionListing = abstractionInfoForPrompt.join('\n');
        // Prepare context with project summary and relationships
        let context = `Project Summary:\n${relationshipAnalysis.summary}\n\n`;
        context += "Relationships (Indices refer to abstractions above):\n";
        for (const rel of relationshipAnalysis.relationships) {
            const fromName = abstractions[rel.from]?.name || `Unknown(${rel.from})`;
            const toName = abstractions[rel.to]?.name || `Unknown(${rel.to})`;
            context += `- From ${rel.from} (${fromName}) to ${rel.to} (${toName}): ${rel.label}\n`;
        }
        const prompt = `
Given the following project abstractions and their relationships for the project \`${projectName}\`:

Abstractions (Index # Name):
${abstractionListing}

Context about relationships and project summary:
${context}

If you are going to make a tutorial for \`${projectName}\`, what is the best order to explain these abstractions, from first to last?
Ideally, first explain those that are the most important or foundational, perhaps user-facing concepts or entry points. Then move to more detailed, lower-level implementation details or supporting concepts.

**IMPORTANT: Please respond with a JSON object in this exact format:**

\`\`\`json
{
  "order": [2, 0, 1, 3]
}
\`\`\`

The order array should contain the abstraction indices in the optimal learning sequence.

Now, provide the JSON output:
`;
        return prompt;
    }
    /**
     * Order chapters based on abstractions and relationships using Gemini AI
     */
    async orderChapters(abstractionAnalysis, relationshipAnalysis, projectName = "Repository") {
        console.log('Starting chapter ordering analysis...');
        if (!abstractionAnalysis.abstractions || abstractionAnalysis.abstractions.length === 0) {
            console.log('No abstractions found for chapter ordering.');
            return { orderedIndices: [] };
        }
        if (!relationshipAnalysis.relationships) {
            console.log('No relationships found for chapter ordering.');
            // Return default order (0, 1, 2, ...)
            const defaultOrder = Array.from({ length: abstractionAnalysis.abstractions.length }, (_, i) => i);
            return { orderedIndices: defaultOrder };
        }
        console.log(`Determining optimal order for ${abstractionAnalysis.abstractions.length} chapters...`);
        console.log('Abstractions to order:');
        abstractionAnalysis.abstractions.forEach((abstraction, index) => {
            console.log(`${index}. ${abstraction.name} (${abstraction.category})`);
        });
        try {
            const prompt = this.createChapterOrderPrompt(abstractionAnalysis.abstractions, relationshipAnalysis, projectName);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return this.processChapterOrderPrompt(text, abstractionAnalysis.abstractions.length);
        }
        catch (error) {
            console.error('Error calling Gemini API for chapter ordering:', error);
            // Return default order on error
            const defaultOrder = Array.from({ length: abstractionAnalysis.abstractions.length }, (_, i) => i);
            return {
                orderedIndices: defaultOrder,
                error: error.message || 'Failed to order chapters with AI'
            };
        }
    }
    /**
     * Process the chapter order prompt and return parsed results
     */
    processChapterOrderPrompt(text, numAbstractions) {
        console.log("=== Raw Order Chapters Response ===");
        console.log(text);
        console.log("===================================");
        // Extract JSON from response - try multiple patterns
        let jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/);
        if (!jsonMatch) {
            // Try without code blocks
            jsonMatch = text.match(/\{[\s\S]*"order"[\s\S]*\}/);
            if (jsonMatch) {
                jsonMatch[1] = jsonMatch[0];
            }
        }
        if (!jsonMatch) {
            console.error("No JSON block found in response");
            const defaultOrder = Array.from({ length: numAbstractions }, (_, i) => i);
            return {
                orderedIndices: defaultOrder,
                error: 'No JSON block found in response',
                raw_response: text
            };
        }
        console.log("=== Extracted JSON ===");
        console.log(jsonMatch[1]);
        console.log("======================");
        try {
            const orderData = JSON.parse(jsonMatch[1]);
            console.log("=== Parsed JSON Data ===");
            console.log(JSON.stringify(orderData, null, 2));
            console.log("========================");
            if (!orderData || typeof orderData !== 'object') {
                throw new Error("LLM output is not a valid object");
            }
            if (!orderData.order) {
                throw new Error("LLM output is missing 'order' key");
            }
            if (!Array.isArray(orderData.order)) {
                throw new Error("order is not an array");
            }
            // Validate and parse the order
            const validatedOrder = [];
            const usedIndices = new Set();
            for (const item of orderData.order) {
                const idx = parseInt(String(item));
                if (isNaN(idx)) {
                    console.warn(`Skipping invalid index: ${item}`);
                    continue;
                }
                if (idx < 0 || idx >= numAbstractions) {
                    console.warn(`Skipping out of range index: ${idx}. Max index is ${numAbstractions - 1}.`);
                    continue;
                }
                if (usedIndices.has(idx)) {
                    console.warn(`Skipping duplicate index: ${idx}`);
                    continue;
                }
                validatedOrder.push(idx);
                usedIndices.add(idx);
            }
            // Add any missing indices to the end
            for (let i = 0; i < numAbstractions; i++) {
                if (!usedIndices.has(i)) {
                    console.warn(`Adding missing index ${i} to the end of order`);
                    validatedOrder.push(i);
                }
            }
            console.log("=== Final Validated Order ===");
            console.log(validatedOrder);
            console.log("=============================");
            return {
                orderedIndices: validatedOrder
            };
        }
        catch (parseError) {
            console.error('Failed to parse JSON response for chapter order:', parseError);
            const defaultOrder = Array.from({ length: numAbstractions }, (_, i) => i);
            return {
                orderedIndices: defaultOrder,
                error: 'Failed to parse AI response as JSON',
                raw_response: text
            };
        }
    }
    /**
     * Helper function to get content for specific file indices
     */
    getContentForIndicesFromFiles(files, indices) {
        const contentMap = {};
        for (const i of indices) {
            if (i >= 0 && i < files.length) {
                const file = files[i];
                contentMap[`${i} # ${file.path}`] = file.content;
            }
        }
        return contentMap;
    }
    /**
     * Clean typical LLM output issues for Markdown
     */
    cleanLLMOutput(content) {
        if (!content)
            return content;
        const lines = content.split('\n');
        const out = [];
        let inFence = false;
        let fenceLang = '';
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            // Normalize fence lines that may have been escaped
            const strippedLeading = line.replace(/^(\s*)\\+/, '$1');
            const fenceStartMatch = strippedLeading.match(/^\s*```(\w*)/);
            if (!inFence && fenceStartMatch) {
                inFence = true;
                fenceLang = (fenceStartMatch[1] || '').toLowerCase();
                out.push(strippedLeading);
                continue;
            }
            // Detect fence end
            if (inFence && /^\s*```/.test(strippedLeading)) {
                inFence = false;
                fenceLang = '';
                out.push(strippedLeading);
                continue;
            }
            if (inFence) {
                if (fenceLang === 'mermaid') {
                    // Remove backslashes from mermaid content
                    out.push(line.replace(/\\+/g, ''));
                }
                else {
                    // Non-mermaid code blocks: leave content untouched
                    out.push(line);
                }
                continue;
            }
            // Outside fenced blocks: fix common escaped characters
            line = line.replace(/^(\s*)\\+(#+\s*)/, '$1$2'); // Fix escaped headings
            line = line.replace(/\\([\[\]()/])/g, '$1'); // Fix escaped brackets and links
            line = line.replace(/\\([*_`>])/g, '$1'); // Fix other markdown punctuation
            out.push(line);
        }
        return out.join('\n');
    }
    /**
     * Validate and clean up chapter content
     */
    validateChapterContent(chapterContent, chapterNum, abstractionName) {
        // Clean up LLM escaping issues
        chapterContent = this.cleanLLMOutput(chapterContent);
        // Remove leading whitespace before headings
        chapterContent = chapterContent.replace(/^[ \t]+(?=#\s*Chapter)/gm, '');
        const actualHeading = `# Chapter ${chapterNum}: ${abstractionName}`;
        if (!chapterContent.trim().startsWith(`# Chapter ${chapterNum}`)) {
            const lines = chapterContent.trim().split('\n');
            if (lines && lines[0].trim().startsWith('#')) {
                // Replace existing heading
                lines[0] = actualHeading;
                chapterContent = lines.join('\n');
            }
            else {
                // Prepend heading
                chapterContent = `${actualHeading}\n\n${chapterContent}`;
            }
        }
        return chapterContent;
    }
    /**
     * Prepare chapter data for writing
     */
    prepareChaptersData(chapterOrder, abstractions, files, projectName) {
        // Create complete list of all chapters
        const allChapters = [];
        const chapterFilenames = {};
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
        // Build project summary
        const projectSummary = abstractions.map(a => `- ${a.name}: ${a.description}`).join('\n');
        // Prepare items to process
        const itemsToProcess = [];
        for (let i = 0; i < chapterOrder.length; i++) {
            const abstractionIndex = chapterOrder[i];
            if (abstractionIndex >= 0 && abstractionIndex < abstractions.length) {
                const abstractionDetails = abstractions[abstractionIndex];
                const relatedFileIndices = abstractionDetails.file_indices || [];
                const relatedFilesContentMap = this.getContentForIndicesFromFiles(files, relatedFileIndices);
                // Get previous and next chapter info
                const prevChapter = i > 0 ? chapterFilenames[chapterOrder[i - 1]] : null;
                const nextChapter = i < chapterOrder.length - 1 ? chapterFilenames[chapterOrder[i + 1]] : null;
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
                });
            }
        }
        return itemsToProcess;
    }
    /**
     * Create the single chapter prompt for Gemini
     */
    createSingleChapterPrompt(item) {
        const { chapterNum, abstractionDetails, projectName, fullChapterListing, relatedFilesContentMap, previousChaptersSummary, projectSummary } = item;
        const abstractionName = abstractionDetails.name;
        const abstractionDescription = abstractionDetails.description;
        // Prepare file context string
        const fileContextStr = Object.entries(relatedFilesContentMap)
            .map(([idxPath, content]) => {
            const fileName = idxPath.includes('# ') ? idxPath.split('# ')[1] : idxPath;
            return `--- File: ${fileName} ---\n${content}`;
        })
            .join('\n\n');
        const prompt = `
Write a very beginner-friendly tutorial chapter (in Markdown format) for the project \`${projectName}\` about the concept: "${abstractionName}". This is Chapter ${chapterNum}.

Project Summary (give this to the reader before the chapter):
${projectSummary || projectName}

Concept Details:
- Name: ${abstractionName}
- Description:
${abstractionDescription}

Complete Tutorial Structure:
${fullChapterListing}

Context from previous chapters:
${previousChaptersSummary || "This is the first chapter."}

Relevant Code Snippets (Code itself remains unchanged):
${fileContextStr || "No specific code snippets provided for this abstraction."}

Instructions for the chapter:
- Start with a clear heading (e.g., \`# Chapter ${chapterNum}: ${abstractionName}\`). Use the provided concept name.

- If this is not the first chapter, begin with a brief transition from the previous chapter, referencing it with a proper Markdown link using its name.

- Begin with a high-level motivation explaining what problem this abstraction solves. Start with a central use case as a concrete example. The whole chapter should guide the reader to understand how to solve this use case. Make it very minimal and friendly to beginners.

- If the abstraction is complex, break it down into key concepts. Explain each concept one-by-one in a very beginner-friendly way.

- Explain how to use this abstraction to solve the use case. Give example inputs and outputs for code snippets (if the output isn't values, describe at a high level what will happen).

- Each code block should be BELOW 10 lines! If longer code blocks are needed, break them down into smaller pieces and walk through them one-by-one. Aggressively simplify the code to make it minimal. Use comments to skip non-important implementation details. Each code block should have a beginner friendly explanation right after it.

- Describe the internal implementation to help understand what's under the hood. First provide a non-code or code-light walkthrough on what happens step-by-step when the abstraction is called. It's recommended to use a simple sequenceDiagram with a dummy example - keep it minimal with at most 5 participants to ensure clarity. If participant name has space, use: \`participant QP as Query Processing\`.

- Then dive deeper into code for the internal implementation with references to files. Provide example code blocks, but make them similarly simple and beginner-friendly. Explain thoroughly.

- IMPORTANT: When you need to refer to other core abstractions covered in other chapters, ALWAYS use proper Markdown links like this: [Chapter Title](filename.md). Use the Complete Tutorial Structure above to find the correct filename and the chapter title.

- Use mermaid diagrams to illustrate complex concepts (\`\`\`mermaid\`\`\` format).

- Heavily use analogies and examples throughout to help beginners understand.

- End the chapter with a brief conclusion that summarizes what was learned and provides a transition to the next chapter. If there is a next chapter, use a proper Markdown link: [Next Chapter Title](next_chapter_filename).

- Ensure the tone is welcoming and easy for a newcomer to understand.

- Output *only* the Markdown content for this chapter.

Now, directly provide a super beginner-friendly Markdown output (DON'T need \`\`\`markdown\`\`\` tags):
`;
        return prompt;
    }
    /**
     * Write tutorial chapters using Gemini AI
     */
    async writeChapters(abstractionAnalysis, chapterOrder, structure, projectName = "Repository") {
        console.log('Starting chapter writing...');
        if (!abstractionAnalysis.abstractions || abstractionAnalysis.abstractions.length === 0) {
            console.log('No abstractions found for chapter writing.');
            return { chapters: [] };
        }
        if (!chapterOrder.orderedIndices || chapterOrder.orderedIndices.length === 0) {
            console.log('No chapter order found for writing.');
            return { chapters: [] };
        }
        const analyzableFiles = this.extractAnalyzableFiles(structure);
        console.log(`Writing ${chapterOrder.orderedIndices.length} chapters for project: ${projectName}`);
        // Prepare all chapter data
        const chapterItems = this.prepareChaptersData(chapterOrder.orderedIndices, abstractionAnalysis.abstractions, analyzableFiles, projectName);
        const generatedChapters = [];
        let cumulativeSummary = "";
        try {
            // Generate chapters sequentially to build cumulative summary
            for (let i = 0; i < chapterItems.length; i++) {
                const item = chapterItems[i];
                item.previousChaptersSummary = cumulativeSummary;
                console.log(`Writing Chapter ${item.chapterNum}: ${item.abstractionDetails.name}...`);
                const prompt = this.createSingleChapterPrompt(item);
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                let chapterContent = response.text();
                // Clean and validate the chapter content
                chapterContent = this.validateChapterContent(chapterContent, item.chapterNum, item.abstractionDetails.name);
                generatedChapters.push(chapterContent);
                // Update cumulative summary for next chapters
                const chapterSummary = `Chapter ${item.chapterNum} (${item.abstractionDetails.name}): ${item.abstractionDetails.description}`;
                cumulativeSummary += (cumulativeSummary ? "\n" : "") + chapterSummary;
                console.log(`✓ Completed Chapter ${item.chapterNum}: ${item.abstractionDetails.name}`);
                // Add delay between requests to avoid rate limiting
                if (i < chapterItems.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            console.log(`Successfully generated ${generatedChapters.length} chapters!`);
            return {
                chapters: generatedChapters
            };
        }
        catch (error) {
            console.error('Error writing chapters with Gemini API:', error);
            return {
                chapters: generatedChapters, // Return what was generated so far
                error: error.message || 'Failed to write chapters with AI'
            };
        }
    }
}
exports.GeminiCodeAnalyzer = GeminiCodeAnalyzer;
