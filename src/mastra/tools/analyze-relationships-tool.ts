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
    - \`from_abstraction\`: Index of the source abstraction (e.g., \`0 # AbstractionName1\`)
    - \`to_abstraction\`: Index of the target abstraction (e.g., \`1 # AbstractionName2\`)
    - \`label\`: A brief label for the interaction **in just a few words**${langHint} (e.g., "Manages", "Inherits", "Uses").
    Ideally the relationship should be backed by one abstraction calling or passing parameters to another.
    Simplify the relationship and exclude those non-important ones.

IMPORTANT: Make sure EVERY abstraction is involved in at least ONE relationship (either as source or target). Each abstraction index must appear at least once across all relationships.

Format the output as YAML:

\`\`\`yaml
summary: |
  A brief, simple explanation of the project${langHint}.
  Can span multiple lines with **bold** and *italic* for emphasis.
relationships:
  - from_abstraction: 0 # AbstractionName1
    to_abstraction: 1 # AbstractionName2
    label: "Manages"${langHint}
  - from_abstraction: 2 # AbstractionName3
    to_abstraction: 0 # AbstractionName1
    label: "Provides config"${langHint}
  # ... other relationships
\`\`\`

Now, provide the YAML output:
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
    
    // Extract YAML from response - try multiple patterns
    let yamlMatch = response.match(/```yaml\n([\s\S]*?)\n```/);
    if (!yamlMatch) {
        yamlMatch = response.match(/```\n([\s\S]*?)\n```/);
    }
    if (!yamlMatch) {
        // Try without backticks
        yamlMatch = response.match(/summary:\s*\|?([\s\S]*)/);
        if (yamlMatch) {
            yamlMatch[1] = response; // Use full response
        }
    }
    
    if (!yamlMatch) {
        console.error("No YAML block found in response");
        throw new Error("No YAML block found in response");
    }
    
    console.log("=== Extracted YAML ===");
    console.log(yamlMatch[1]);
    console.log("======================");
    
    let relationshipsData: any;
    try {
        // Try using a more robust YAML parsing approach
        relationshipsData = parseImprovedYAML(yamlMatch[1]);
        console.log("=== Parsed YAML Data ===");
        console.log(JSON.stringify(relationshipsData, null, 2));
        console.log("========================");
    } catch (error) {
        console.error("Failed to parse YAML:", error);
        throw new Error(`Failed to parse YAML: ${error}`);
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
        
        if (!rel.from_abstraction || !rel.to_abstraction || !rel.label) {
            console.warn(`Missing keys in relationship item: ${JSON.stringify(rel)}`);
            continue;
        }
        
        if (typeof rel.label !== 'string') {
            console.warn(`Relationship label is not a string: ${JSON.stringify(rel)}`);
            continue;
        }
        
        // Validate indices
        try {
            const fromIdx = parseInt(String(rel.from_abstraction).split('#')[0].trim());
            const toIdx = parseInt(String(rel.to_abstraction).split('#')[0].trim());
            
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

// Improved YAML parser for the specific format we expect
function parseImprovedYAML(yamlStr: string): any {
    console.log("=== Parsing YAML ===");
    console.log(yamlStr);
    console.log("===================");
    
    const lines = yamlStr.trim().split('\n').map(line => line.trimEnd());
    const result: any = {};
    let currentKey = '';
    let currentValue = '';
    let inMultiline = false;
    let relationships: any[] = [];
    let currentRelationship: any = {};
    let inRelationships = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) {
            continue;
        }
        
        console.log(`Processing line ${i}: "${line}"`);
        
        // Check for relationships section
        if (line.trim() === 'relationships:') {
            console.log("Found relationships section");
            if (inMultiline && currentKey === 'summary') {
                result[currentKey] = currentValue.trim();
                inMultiline = false;
            }
            inRelationships = true;
            continue;
        }
        
        // Check for summary section
        if (line.trim().startsWith('summary:')) {
            currentKey = 'summary';
            const summaryValue = line.replace(/summary:\s*/, '').trim();
            if (summaryValue === '|' || summaryValue === '') {
                inMultiline = true;
                currentValue = '';
                console.log("Starting multiline summary");
            } else {
                result[currentKey] = summaryValue;
                console.log(`Found inline summary: ${summaryValue}`);
            }
            continue;
        }
        
        // Handle multiline summary content
        if (inMultiline && currentKey === 'summary' && !inRelationships) {
            currentValue += (currentValue ? '\n' : '') + line.trim();
            console.log(`Added to summary: "${line.trim()}"`);
            continue;
        }
        
        // Handle relationships
        if (inRelationships) {
            if (line.trim().startsWith('- ')) {
                // Save previous relationship if exists
                if (Object.keys(currentRelationship).length > 0) {
                    relationships.push(currentRelationship);
                    console.log(`Saved relationship: ${JSON.stringify(currentRelationship)}`);
                }
                
                // Start new relationship
                currentRelationship = {};
                const relationshipLine = line.trim().substring(2); // Remove '- '
                
                // Parse the first key-value pair
                const colonIndex = relationshipLine.indexOf(':');
                if (colonIndex !== -1) {
                    const key = relationshipLine.substring(0, colonIndex).trim();
                    const value = relationshipLine.substring(colonIndex + 1).trim();
                    currentRelationship[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
                    console.log(`Started new relationship with ${key}: ${value}`);
                }
            } else if (line.includes(':') && !line.trim().startsWith('#')) {
                // Continue adding to current relationship
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    currentRelationship[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
                    console.log(`Added to relationship ${key}: ${value}`);
                }
            }
        }
    }
    
    // Save the last relationship
    if (Object.keys(currentRelationship).length > 0) {
        relationships.push(currentRelationship);
        console.log(`Saved final relationship: ${JSON.stringify(currentRelationship)}`);
    }
    
    // Save multiline summary if we were in one
    if (inMultiline && currentKey === 'summary') {
        result[currentKey] = currentValue.trim();
        console.log(`Saved multiline summary: ${result[currentKey]}`);
    }
    
    // Add relationships to result
    if (relationships.length > 0) {
        result.relationships = relationships;
        console.log(`Total relationships found: ${relationships.length}`);
    }
    
    console.log("=== Final parsed result ===");
    console.log(JSON.stringify(result, null, 2));
    console.log("===========================");
    
    return result;
}