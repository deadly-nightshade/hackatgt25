import { z } from 'zod';

// Helper function to get content for specific file indices
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

// Input schema for the analyze relationships function
export const AnalyzeRelationshipsInputSchema = z.object({
    abstractions: z.array(z.object({
        name: z.string(),
        description: z.string(),
        files: z.array(z.number()), // file indices
    })),
    filesData: z.array(z.tuple([z.string(), z.string()])), // [path, content] pairs
    projectName: z.string(),
    language: z.string().default('english'),
    useCache: z.boolean().default(true),
});

// Output schema for the analyze relationships function
export const AnalyzeRelationshipsOutputSchema = z.object({
    summary: z.string(),
    details: z.array(z.object({
        from: z.number(),
        to: z.number(),
        label: z.string(),
    })),
});

export type AnalyzeRelationshipsInput = z.infer<typeof AnalyzeRelationshipsInputSchema>;
export type AnalyzeRelationshipsOutput = z.infer<typeof AnalyzeRelationshipsOutputSchema>;

/**
 * Analyzes relationships between code abstractions
 * Based on the Python AnalyzeRelationships class
 */
export function prepareRelationshipAnalysisPrompt(input: AnalyzeRelationshipsInput): string {
    const { abstractions, filesData, projectName, language } = input;
    
    const numAbstractions = abstractions.length;
    
    // Create context with abstraction names, indices, descriptions, and relevant file snippets
    let context = "Identified Abstractions:\n";
    const allRelevantIndices = new Set<number>();
    const abstractionInfoForPrompt: string[] = [];
    
    for (let i = 0; i < abstractions.length; i++) {
        const abstr = abstractions[i];
        const fileIndicesStr = abstr.files.join(", ");
        const infoLine = `- Index ${i}: ${abstr.name} (Relevant file indices: [${fileIndicesStr}])\n  Description: ${abstr.description}`;
        context += infoLine + "\n";
        abstractionInfoForPrompt.push(`${i} # ${abstr.name}`);
        abstr.files.forEach(idx => allRelevantIndices.add(idx));
    }
    
    context += "\nRelevant File Snippets (Referenced by Index and Path):\n";
    
    // Get content for relevant files
    const relevantFilesContentMap = getContentForIndices(
        filesData, 
        Array.from(allRelevantIndices).sort()
    );
    
    // Format file content for context
    const fileContextStr = Object.entries(relevantFilesContentMap)
        .map(([idxPath, content]) => `--- File: ${idxPath} ---\n${content}`)
        .join("\n\n");
    
    context += fileContextStr;
    
    const abstractionListing = abstractionInfoForPrompt.join("\n");
    
    // Add language instruction and hints only if not English
    let languageInstruction = "";
    let langHint = "";
    let listLangNote = "";
    
    if (language.toLowerCase() !== "english") {
        languageInstruction = `IMPORTANT: Generate the \`summary\` and relationship \`label\` fields in **${language.charAt(0).toUpperCase() + language.slice(1)}** language. Do NOT use English for these fields.\n\n`;
        langHint = ` (in ${language.charAt(0).toUpperCase() + language.slice(1)})`;
        listLangNote = ` (Names might be in ${language.charAt(0).toUpperCase() + language.slice(1)})`;
    }
    
    const prompt = `
Based on the following abstractions and relevant code snippets from the project \`${projectName}\`:

List of Abstraction Indices and Names${listLangNote}:
${abstractionListing}

Context (Abstractions, Descriptions, Code):
${context}

${languageInstruction}Please provide:
1. A high-level \`summary\` of the project's main purpose and functionality in a few beginner-friendly sentences${langHint}. Use markdown formatting with **bold** and *italic* text to highlight important concepts.
2. A list (\`relationships\`) describing the key interactions between these abstractions. For each relationship, specify:
    - \`from\`: Index of the source abstraction (e.g., \`0\`)
    - \`to\`: Index of the target abstraction (e.g., \`1\`)
    - \`label\`: A brief label for the interaction **in just a few words**${langHint} (e.g., "Manages", "Inherits", "Uses").
    Ideally the relationship should be backed by one abstraction calling or passing parameters to another.
    Simplify the relationship and exclude those non-important ones.

IMPORTANT: Make sure EVERY abstraction is involved in at least ONE relationship (either as source or target). Each abstraction index must appear at least once across all relationships.

**IMPORTANT: Please respond with a JSON object in this exact format:**

\`\`\`json
{
  "summary": "A brief, simple explanation of the project${langHint}. Can span multiple sentences with **bold** and *italic* for emphasis.",
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
 * Validates and parses the relationship analysis response
 */
export function validateRelationshipAnalysisResponse(
    response: string, 
    numAbstractions: number
): AnalyzeRelationshipsOutput {
    console.log("=== Raw LLM Response ===");
    console.log(response);
    console.log("========================");
    
    // Extract JSON from response - try multiple patterns
    let jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n\s*```/);
    if (!jsonMatch) {
        // Try without code blocks
        jsonMatch = response.match(/\{[\s\S]*"summary"[\s\S]*\}/);
        if (jsonMatch) {
            jsonMatch[1] = jsonMatch[0];
        }
    }
    
    if (!jsonMatch) {
        console.error("No JSON block found in response");
        throw new Error("No JSON block found in response");
    }
    
    console.log("=== Extracted JSON ===");
    console.log(jsonMatch[1]);
    console.log("======================");
    
    let relationshipsData: any;
    try {
        // Parse the JSON
        relationshipsData = JSON.parse(jsonMatch[1]);
        console.log("=== Parsed JSON Data ===");
        console.log(JSON.stringify(relationshipsData, null, 2));
        console.log("========================");
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        throw new Error(`Failed to parse JSON: ${error}`);
    }
    
    if (!relationshipsData || typeof relationshipsData !== 'object') {
        throw new Error("LLM output is not a valid object");
    }
    
    if (!relationshipsData.summary) {
        throw new Error("LLM output is missing 'summary' key");
    }
    
    if (!relationshipsData.relationships) {
        throw new Error("LLM output is missing 'relationships' key");
    }
    
    if (typeof relationshipsData.summary !== 'string') {
        throw new Error("summary is not a string");
    }
    
    if (!Array.isArray(relationshipsData.relationships)) {
        throw new Error("relationships is not a list");
    }
    
    // Validate relationships structure
    const validatedRelationships: Array<{ from: number; to: number; label: string }> = [];
    
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
        try {
            const fromIdx = parseInt(String(rel.from));
            const toIdx = parseInt(String(rel.to));
            
            if (fromIdx < 0 || fromIdx >= numAbstractions || toIdx < 0 || toIdx >= numAbstractions) {
                console.warn(
                    `Invalid index in relationship: from=${fromIdx}, to=${toIdx}. Max index is ${numAbstractions - 1}.`
                );
                continue;
            }
            
            validatedRelationships.push({
                from: fromIdx,
                to: toIdx,
                label: rel.label,
            });
        } catch (error) {
            console.warn(`Could not parse indices from relationship: ${JSON.stringify(rel)}`);
            continue;
        }
    }
    
    console.log("=== Validated Relationships ===");
    console.log(JSON.stringify(validatedRelationships, null, 2));
    console.log("===============================");
    
    return {
        summary: relationshipsData.summary,
        details: validatedRelationships,
    };
}