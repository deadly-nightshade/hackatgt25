import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { prepareRelationshipAnalysisPrompt, validateRelationshipAnalysisResponse } from '../tools/analyze-relationships-tool';
import { prepareOrderChaptersPrompt, validateOrderChaptersResponse } from '../tools/order-chapters-tool';
import { prepareChaptersData, prepareSingleChapterPrompt, validateChapterContent } from '../tools/write-chapters-tool';

import { analyseFileAgent } from "../agents/analyse_file";
import { analyseRelationsAgent } from "../agents/analyse_relations";
import { repoAnalyst } from "../agents/fetch_repo";
import { IdentifyAbstractionAgent } from "../agents/identify_abstractions";
import { OrderChaptersAgent } from "../agents/order_chapters";
import { WriteChapterAgent } from "../agents/write_chapter";

const fetchRepoStep = createStep({
    id: "fetch-repo-step",
    description: "Fetch and analyze repository from GitHub URL",
    inputSchema: z.object({
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        repoContent: z.string(),
        repoAnalysis: z.string(),
        filesData: z.array(z.tuple([z.string(), z.string()])), // Store files data for relationship analysis
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('repoAnalyst');
        if (!agent) {
            throw new Error("repoAnalyst agent not found");
        }

        const prompt = `Analyze the GitHub repository at: ${inputData.repoUrl}. Provide a comprehensive overview of the repository structure, main files, and overall purpose. Also, extract and return the actual file contents in a structured format.`;

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        // Mock files data for now - in a real implementation, you'd extract this from the repo
        const mockFilesData: Array<[string, string]> = [
            ["src/main.ts", "// Main application file\nexport class App {\n  start() {\n    console.log('Starting app');\n  }\n}"],
            ["src/config.ts", "// Configuration file\nexport const config = {\n  port: 3000,\n  database: 'mongodb://localhost'\n};"],
            ["src/utils.ts", "// Utility functions\nexport function formatDate(date: Date): string {\n  return date.toISOString();\n}"],
        ];

        return { 
            repoContent: response.text,
            repoAnalysis: response.text,
            filesData: mockFilesData
        };
    }
});

const identifyAbstractionsStep = createStep({
    id: "identify-abstractions-step",
    description: "Identify key abstractions from repository analysis",
    inputSchema: z.object({
        repoContent: z.string(),
        repoAnalysis: z.string(),
        filesData: z.array(z.tuple([z.string(), z.string()])),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        parsedAbstractions: z.array(z.object({
            name: z.string(),
            description: z.string(),
            files: z.array(z.number()),
        })),
        filesData: z.array(z.tuple([z.string(), z.string()])), // Pass through for next step
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('IdentifyAbstractionAgent');
        if (!agent) {
            throw new Error("IdentifyAbstractionAgent not found");
        }

        const prompt = `Based on this repository analysis:

${inputData.repoAnalysis}

Identify the key abstractions, patterns, and architectural concepts in this codebase. Focus on:
- Main classes, interfaces, or data structures
- Design patterns used
- Core business logic abstractions
- Key architectural components

**IMPORTANT: Please respond with a JSON object in this exact format:**

\`\`\`json
{
  "abstractions": [
    {
      "name": "AbstractionName",
      "description": "Brief description of what this abstraction does and its purpose in the system",
      "category": "class|interface|pattern|component|service"
    },
    {
      "name": "AnotherAbstraction", 
      "description": "Another description",
      "category": "class|interface|pattern|component|service"
    }
  ]
}
\`\`\`

Provide 3-8 key abstractions that represent the most important concepts in this codebase.`;

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        // Parse abstractions from JSON response
        const { abstractionsList, parsedAbstractions } = parseAbstractionsFromJSONResponse(response.text, inputData.filesData);

        return { 
            abstractions: response.text,
            abstractionsList: abstractionsList,
            parsedAbstractions: parsedAbstractions,
            filesData: inputData.filesData
        };
    }
});

// Enhanced helper function to parse abstraction names from JSON response
function parseAbstractionsFromJSONResponse(responseText: string, filesData: Array<[string, string]>): {
    abstractionsList: string[];
    parsedAbstractions: Array<{name: string; description: string; files: number[]}>;
} {
    console.log("=== Parsing Abstractions from JSON Response ===");
    console.log(responseText);
    console.log("===============================================");
    
    try {
        // Extract JSON from response - try multiple patterns
        let jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)\n\s*```/);
        if (!jsonMatch) {
            // Try without code blocks
            jsonMatch = responseText.match(/\{[\s\S]*"abstractions"[\s\S]*\}/);
            if (jsonMatch) {
                jsonMatch[1] = jsonMatch[0];
            }
        }
        
        if (!jsonMatch) {
            throw new Error("No JSON block found in response");
        }

        console.log("=== Extracted JSON ===");
        console.log(jsonMatch[1]);
        console.log("=====================");

        // Parse the JSON
        const jsonData = JSON.parse(jsonMatch[1]);
        
        if (!jsonData.abstractions || !Array.isArray(jsonData.abstractions)) {
            throw new Error("Invalid JSON structure: missing or invalid 'abstractions' array");
        }

        const abstractionsList: string[] = [];
        const parsedAbstractions: Array<{name: string; description: string; files: number[]}> = [];

        jsonData.abstractions.forEach((abstraction: any, index: number) => {
            if (abstraction.name && typeof abstraction.name === 'string') {
                const name = abstraction.name.trim();
                const description = abstraction.description || `Description for ${name}`;
                const files = [index % filesData.length]; // Distribute across available files
                
                abstractionsList.push(name);
                parsedAbstractions.push({
                    name: name,
                    description: description,
                    files: files
                });
                
                console.log(`✅ Parsed abstraction: "${name}"`);
            }
        });

        console.log("=== Final Abstraction Names ===");
        console.log(abstractionsList);
        console.log("===============================");

        if (abstractionsList.length === 0) {
            throw new Error("No valid abstractions found in JSON response");
        }

        return {
            abstractionsList,
            parsedAbstractions
        };

    } catch (error) {
        console.error("❌ JSON parsing failed:", error);
        console.log("🔄 Falling back to text extraction...");

        // Fallback: Extract potential class/concept names from the text
        const fallbackNames = extractAbstractionsFallback(responseText);
        const parsedAbstractions = fallbackNames.map((name, index) => ({
            name: name,
            description: `Automatically extracted abstraction: ${name}`,
            files: [index % filesData.length]
        }));

        console.log("=== Fallback Abstraction Names ===");
        console.log(fallbackNames);
        console.log("==================================");

        return {
            abstractionsList: fallbackNames,
            parsedAbstractions: parsedAbstractions
        };
    }
}

// Fallback function to extract abstraction names from text
function extractAbstractionsFallback(text: string): string[] {
    // Look for capitalized words that could be class/concept names
    const matches = text.match(/\b[A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*\b/g);
    
    if (!matches) {
        return ['DefaultAbstraction'];
    }
    
    // Filter and deduplicate
    const filteredNames = [...new Set(matches)]
        .filter(name => 
            name.length > 2 && 
            !['JSON', 'API', 'HTTP', 'URL', 'ID', 'UUID'].includes(name) // Remove common abbreviations
        )
        .slice(0, 8); // Limit to first 8
    
    return filteredNames.length > 0 ? filteredNames : ['DefaultAbstraction'];
}

const analyzeRelationshipsStep = createStep({
    id: "analyze-relationships-step", 
    description: "Analyze relationships between identified abstractions",
    inputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        parsedAbstractions: z.array(z.object({
            name: z.string(),
            description: z.string(),
            files: z.array(z.number()),
        })),
        filesData: z.array(z.tuple([z.string(), z.string()])),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(), 
            label: z.string(),
        })),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('analyseRelationsAgent');
        if (!agent) {
            throw new Error("analyseRelationsAgent not found");
        }

        // Prepare the prompt using our tool function
        const prompt = prepareRelationshipAnalysisPrompt({
            abstractions: inputData.parsedAbstractions,
            filesData: inputData.filesData,
            projectName: "GitHub Repository", // You can extract this from the repo URL
            language: "english",
            useCache: true,
        });

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        // Validate and parse the response
        try {
            console.log("=== Starting relationship analysis validation ===");
            const relationshipData = validateRelationshipAnalysisResponse(
                response.text, 
                inputData.parsedAbstractions.length
            );

            console.log("=== Successfully parsed relationships ===");
            return {
                abstractions: inputData.abstractions,
                abstractionsList: inputData.abstractionsList,
                relationshipSummary: relationshipData.summary,
                relationships: relationshipData.details,
            };
        } catch (error) {
            console.error("=== Failed to parse relationship analysis ===");
            console.error("Error:", error);
            console.error("Raw response was:");
            console.error(response.text);
            console.error("=== End error details ===");
            
            // Return with empty relationships if parsing fails
            return {
                abstractions: inputData.abstractions,
                abstractionsList: inputData.abstractionsList,
                relationshipSummary: "Failed to analyze relationships: " + (error as Error).message,
                relationships: [],
            };
        }
    }
});

const orderChaptersStep = createStep({
    id: "order-chapters-step",
    description: "Determine optimal order for presenting abstractions in educational chapters",
    inputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(), 
            label: z.string(),
        })),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(), 
            label: z.string(),
        })),
        chapterOrder: z.array(z.number()),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('OrderChaptersAgent');
        if (!agent) {
            throw new Error("OrderChaptersAgent not found");
        }

        // Convert abstractionsList back to structured format for the tool
        const structuredAbstractions = inputData.abstractionsList.map((name, index) => ({
            name: name,
            description: `Description for ${name}`, // Mock description
            files: [index % 3], // Mock file indices
        }));

        // Prepare relationships in the expected format
        const relationshipsData = {
            summary: inputData.relationshipSummary,
            details: inputData.relationships,
        };

        // Prepare the prompt using our tool function
        const prompt = prepareOrderChaptersPrompt({
            abstractions: structuredAbstractions,
            relationships: relationshipsData,
            projectName: "GitHub Repository", // You can extract this from the repo URL
            language: "english",
            useCache: true,
        });

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        // Validate and parse the response
        try {
            console.log("=== Starting chapter ordering validation ===");
            const orderData = validateOrderChaptersResponse(
                response.text, 
                inputData.abstractionsList.length
            );

            console.log("=== Successfully parsed chapter order ===");
            return {
                abstractions: inputData.abstractions,
                abstractionsList: inputData.abstractionsList,
                relationshipSummary: inputData.relationshipSummary,
                relationships: inputData.relationships,
                chapterOrder: orderData.orderedIndices,
            };
        } catch (error) {
            console.error("=== Failed to parse chapter ordering ===");
            console.error("Error:", error);
            console.error("Raw response was:");
            console.error(response.text);
            console.error("=== End error details ===");
            
            // Return with default order if parsing fails
            const defaultOrder = Array.from({ length: inputData.abstractionsList.length }, (_, i) => i);
            return {
                abstractions: inputData.abstractions,
                abstractionsList: inputData.abstractionsList,
                relationshipSummary: inputData.relationshipSummary,
                relationships: inputData.relationships,
                chapterOrder: defaultOrder,
            };
        }
    }
});

const writeChaptersStep = createStep({
    id: "write-chapters-step",
    description: "Write beginner-friendly tutorial chapters for each abstraction",
    inputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(), 
            label: z.string(),
        })),
        chapterOrder: z.array(z.number()),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(), 
            label: z.string(),
        })),
        chapterOrder: z.array(z.number()),
        chapters: z.array(z.string()),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('WriteChapterAgent');
        if (!agent) {
            throw new Error("WriteChapterAgent not found");
        }

        // Convert abstractionsList to structured format with mock file data
        const structuredAbstractions = inputData.abstractionsList.map((name, index) => ({
            name: name,
            description: `A comprehensive overview of ${name} and its role in the system architecture.`,
            files: [index % 3], // Mock file indices
        }));

        // Mock files data - in real implementation this would come from the repository
        const mockFilesData: Array<[string, string]> = [
            ["src/main.ts", "// Main application file\nexport class App {\n  start() {\n    console.log('Starting app');\n  }\n}"],
            ["src/config.ts", "// Configuration file\nexport const config = {\n  port: 3000,\n  database: 'mongodb://localhost'\n};"],
            ["src/utils.ts", "// Utility functions\nexport function formatDate(date: Date): string {\n  return date.toISOString();\n}"],
        ];

        // Prepare chapters data using our tool
        const chaptersToWrite = prepareChaptersData({
            chapterOrder: inputData.chapterOrder,
            abstractions: structuredAbstractions,
            filesData: mockFilesData,
            projectName: "GitHub Repository",
            language: "english",
            useCache: true,
        });

        console.log(`=== Writing ${chaptersToWrite.length} chapters ===`);
        
        const generatedChapters: string[] = [];
        let previousChaptersSummary = "";

        // Write chapters sequentially to build context
        for (let i = 0; i < chaptersToWrite.length; i++) {
            const chapterData = chaptersToWrite[i];
            
            // Update previous chapters summary for context
            chapterData.previousChaptersSummary = previousChaptersSummary;
            
            console.log(`Writing chapter ${chapterData.chapterNum}: ${chapterData.abstractionDetails.name}`);
            
            try {
                // Prepare the prompt
                const prompt = prepareSingleChapterPrompt(chapterData);
                
                // Generate the chapter content
                const response = await agent.generate([
                    { role: 'user', content: prompt }
                ]);
                
                // Validate and clean up the content
                const validatedContent = validateChapterContent(
                    response.text,
                    chapterData.chapterNum,
                    chapterData.abstractionDetails.name
                );
                
                generatedChapters.push(validatedContent);
                
                // Add this chapter to the summary for future chapters
                const chapterSummary = `Chapter ${chapterData.chapterNum}: ${chapterData.abstractionDetails.name}\n${validatedContent.substring(0, 500)}...`;
                previousChaptersSummary += (previousChaptersSummary ? "\n---\n" : "") + chapterSummary;
                
                console.log(`✅ Successfully wrote chapter ${chapterData.chapterNum}`);
                
            } catch (error) {
                console.error(`❌ Failed to write chapter ${chapterData.chapterNum}:`, error);
                
                // Generate fallback chapter content
                const fallbackContent = `# Chapter ${chapterData.chapterNum}: ${chapterData.abstractionDetails.name}

## Overview
This chapter covers the ${chapterData.abstractionDetails.name} abstraction in our system.

## Description
${chapterData.abstractionDetails.description}

## Implementation
[Content generation failed - please review manually]

## Summary
This chapter introduced the ${chapterData.abstractionDetails.name} concept and its role in the system.
`;
                generatedChapters.push(fallbackContent);
            }
        }

        console.log(`=== Successfully generated ${generatedChapters.length} chapters ===`);

        return {
            abstractions: inputData.abstractions,
            abstractionsList: inputData.abstractionsList,
            relationshipSummary: inputData.relationshipSummary,
            relationships: inputData.relationships,
            chapterOrder: inputData.chapterOrder,
            chapters: generatedChapters,
        };
    }
});


const sequentialPipeline = createWorkflow({
    id: "github-analysis-workflow",
    inputSchema: z.object({
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(),
            label: z.string(),
        })),
        chapterOrder: z.array(z.number()),
        chapters: z.array(z.string()),
    }),
})
   .then(fetchRepoStep)
   .then(identifyAbstractionsStep)
   .then(analyzeRelationshipsStep)
   .then(orderChaptersStep)
   .then(writeChaptersStep)
   .then(createStep({
    id: "final-output-step",
    description: "Format final output with repository analysis, abstractions, relationships, chapter order, and generated chapters",
    inputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(),
            label: z.string(),
        })),
        chapterOrder: z.array(z.number()),
        chapters: z.array(z.string()),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
        relationshipSummary: z.string(),
        relationships: z.array(z.object({
            from: z.number(),
            to: z.number(),
            label: z.string(),
        })),
        chapterOrder: z.array(z.number()),
        chapters: z.array(z.string()),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        console.log("=== GitHub Repository Analysis Results ===");
        console.log("Abstractions:", inputData.abstractionsList);

        console.log("Relationship Summary:", inputData.relationshipSummary);
        console.log("Relationships:", inputData.relationships);
        console.log("Chapter Order:", inputData.chapterOrder);
        console.log("Generated Chapters:", inputData.chapters.length);

        return {
            abstractions: inputData.abstractions,
            abstractionsList: inputData.abstractionsList,
            relationshipSummary: inputData.relationshipSummary,
            relationships: inputData.relationships,
            chapterOrder: inputData.chapterOrder,
            chapters: inputData.chapters,
        };
    }
}));

sequentialPipeline.commit();
export { sequentialPipeline };