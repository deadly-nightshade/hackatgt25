import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { prepareRelationshipAnalysisPrompt, validateRelationshipAnalysisResponse } from '../tools/analyze-relationships-tool';

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

Provide a clear list of the most important abstractions.`;

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        // Parse abstractions from response
        const abstractionsList = response.text
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.replace(/^[-*•]\s*/, '').trim())
            .filter(line => line.length > 0);

        // Parse abstractions for structured format (mock for now)
        const parsedAbstractions = abstractionsList.map((name, index) => ({
            name: name,
            description: `Description for ${name}`,
            files: [index % inputData.filesData.length], // Mock file indices
        }));

        return { 
            abstractions: response.text,
            abstractionsList: abstractionsList,
            parsedAbstractions: parsedAbstractions,
            filesData: inputData.filesData
        };
    }
});

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
    }),
})
   .then(fetchRepoStep)
   .then(identifyAbstractionsStep)
   .then(analyzeRelationshipsStep)
   .then(createStep({
    id: "final-output-step",
    description: "Format final output with repository analysis, abstractions, and relationships",
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
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        console.log("=== GitHub Repository Analysis Results ===");
        console.log("Abstractions:", inputData.abstractionsList);
        console.log("Relationship Summary:", inputData.relationshipSummary);
        console.log("Relationships:", inputData.relationships);

        return {
            abstractions: inputData.abstractions,
            abstractionsList: inputData.abstractionsList,
            relationshipSummary: inputData.relationshipSummary,
            relationships: inputData.relationships,
        };
    }
}));

sequentialPipeline.commit();
export { sequentialPipeline };