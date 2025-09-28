import { z } from 'zod';

// Input schema for the order chapters function
export const OrderChaptersInputSchema = z.object({
    abstractions: z.array(z.object({
        name: z.string(),
        description: z.string(),
        files: z.array(z.number()), // file indices
    })),
    relationships: z.object({
        summary: z.string(),
        details: z.array(z.object({
            from: z.number(),
            to: z.number(),
            label: z.string(),
        })),
    }),
    projectName: z.string(),
    language: z.string().default('english'),
    useCache: z.boolean().default(true),
});

// Output schema for the order chapters function
export const OrderChaptersOutputSchema = z.object({
    orderedIndices: z.array(z.number()),
});

export type OrderChaptersInput = z.infer<typeof OrderChaptersInputSchema>;
export type OrderChaptersOutput = z.infer<typeof OrderChaptersOutputSchema>;

/**
 * Prepares the prompt for ordering chapters based on abstractions and relationships
 * Based on the Python OrderChapters class
 */
export function prepareOrderChaptersPrompt(input: OrderChaptersInput): string {
    const { abstractions, relationships, projectName, language } = input;
    
    // Prepare abstraction info for prompt
    const abstractionInfoForPrompt: string[] = [];
    for (let i = 0; i < abstractions.length; i++) {
        const abstraction = abstractions[i];
        abstractionInfoForPrompt.push(`- ${i} # ${abstraction.name}`);
    }
    const abstractionListing = abstractionInfoForPrompt.join('\n');
    
    // Prepare context with project summary and relationships
    let summaryNote = "";
    let listLangNote = "";
    
    if (language.toLowerCase() !== "english") {
        summaryNote = ` (Note: Project Summary might be in ${language.charAt(0).toUpperCase() + language.slice(1)})`;
        listLangNote = ` (Names might be in ${language.charAt(0).toUpperCase() + language.slice(1)})`;
    }
    
    let context = `Project Summary${summaryNote}:\n${relationships.summary}\n\n`;
    context += "Relationships (Indices refer to abstractions above):\n";
    
    for (const rel of relationships.details) {
        const fromName = abstractions[rel.from].name;
        const toName = abstractions[rel.to].name;
        context += `- From ${rel.from} (${fromName}) to ${rel.to} (${toName}): ${rel.label}\n`;
    }
    
    const prompt = `
Given the following project abstractions and their relationships for the project \`${projectName}\`:

Abstractions (Index # Name)${listLangNote}:
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
 * Validates and parses the order chapters response
 */
export function validateOrderChaptersResponse(
    response: string, 
    numAbstractions: number
): OrderChaptersOutput {
    console.log("=== Raw Order Chapters Response ===");
    console.log(response);
    console.log("===================================");
    
    // Extract JSON from response - try multiple patterns
    let jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n\s*```/);
    if (!jsonMatch) {
        // Try without code blocks
        jsonMatch = response.match(/\{[\s\S]*"order"[\s\S]*\}/);
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
    
    let orderData: any;
    try {
        // Parse the JSON
        orderData = JSON.parse(jsonMatch[1]);
        console.log("=== Parsed JSON Data ===");
        console.log(JSON.stringify(orderData, null, 2));
        console.log("========================");
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        throw new Error(`Failed to parse JSON: ${error}`);
    }
    
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
    const validatedOrder: number[] = [];
    const usedIndices = new Set<number>();
    
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