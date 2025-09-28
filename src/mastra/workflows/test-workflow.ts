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
import { GitHubService } from "../../services/github-service";

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

        console.log(`=== Fetching repository data from: ${inputData.repoUrl} ===`);

        // Initialize GitHub service
        const githubService = new GitHubService();
        
        try {
            // Fetch real repository data
            const repoData = await githubService.parseRepository(inputData.repoUrl);
            
            console.log(`Found ${repoData.files.length} files in repository: ${repoData.name}`);
            
            // Convert to the expected format
            const filesData: Array<[string, string]> = repoData.files
                .filter(file => file.content && file.content.length < 50000) // Limit file size to prevent overwhelming
                .map(file => [file.path, file.content || ''] as [string, string])
                .slice(0, 50); // Limit to first 50 files to prevent overwhelming the analysis
            
            console.log(`Selected ${filesData.length} files for analysis`);
            console.log('Files selected:', filesData.map(([path]) => path));

            // Use the agent for high-level analysis
            const agent = mastra?.getAgent('repoAnalyst');
            if (!agent) {
                throw new Error("repoAnalyst agent not found");
            }

            // Create a summary of the repository structure for the agent
            const fileSummary = filesData.map(([path, content]) => 
                `File: ${path}\nSize: ${content.length} characters\nLanguage: ${githubService.getLanguageFromPath(path)}\nPreview: ${content.substring(0, 200)}...`
            ).join('\n\n---\n\n');

            const prompt = `Analyze this GitHub repository: ${repoData.name}
            
Description: ${repoData.description}
Main Language: ${repoData.language}
Total Files Analyzed: ${filesData.length}

Repository Files Summary:
${fileSummary}

Please provide a comprehensive overview of:
1. The repository structure and organization
2. Main functionality and purpose 
3. Key architectural patterns used
4. Technologies and frameworks involved
5. Entry points and main components`;

            const response = await agent.generate([
                { role: 'user', content: prompt }
            ]);

            return { 
                repoContent: `Repository: ${repoData.name}\nDescription: ${repoData.description}\nLanguage: ${repoData.language}\nFiles: ${filesData.length}`,
                repoAnalysis: response.text,
                filesData: filesData
            };
            
        } catch (error) {
            console.error("Failed to fetch repository data:", error);
            console.log("🔄 Falling back to mock data...");
            
            // Fallback to mock data if GitHub API fails
            const mockFilesData: Array<[string, string]> = [
                ["src/main.ts", "// Main application file\nexport class App {\n  start() {\n    console.log('Starting app');\n  }\n}"],
                ["src/config.ts", "// Configuration file\nexport const config = {\n  port: 3000,\n  database: 'mongodb://localhost'\n};"],
                ["src/utils.ts", "// Utility functions\nexport function formatDate(date: Date): string {\n  return date.toISOString();\n}"],
            ];

            const agent = mastra?.getAgent('repoAnalyst');
            if (!agent) {
                throw new Error("repoAnalyst agent not found");
            }

            const prompt = `Analyze the GitHub repository at: ${inputData.repoUrl}. Note: Using fallback mock data due to API issues.`;
            const response = await agent.generate([
                { role: 'user', content: prompt }
            ]);

            return { 
                repoContent: response.text,
                repoAnalysis: response.text,
                filesData: mockFilesData
            };
        }
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

        const prompt = `Analyze this repository to identify key abstractions and their implementing files.

Repository Analysis:
${inputData.repoAnalysis}

Available Files (analyze each file's content to determine which abstractions it implements):
${inputData.filesData.map(([path, content], index) => {
            const preview = content.substring(0, 1500);
            const hasMore = content.length > 1500 ? '\n[... content truncated ...]' : '';
            return `File ${index}: ${path}
Content:
${preview}${hasMore}

---`;
        }).join('\n')}

**TASK**: Carefully analyze each file's actual content to identify:
1. What classes, interfaces, services, or patterns are defined or implemented
2. Which files work together to implement the same conceptual abstraction
3. The relationships between different code concepts

**IMPORTANT RULES**:
- Some files may implement MULTIPLE abstractions (include the file in multiple abstraction "files" arrays)
- Some files may implement NO major abstractions (don't force them into abstractions)
- Some abstractions may span MULTIPLE files (list all relevant file indices)
- Look at imports, exports, class names, function purposes, and code patterns
- Base your analysis on ACTUAL file content, not just file names

**REQUIRED JSON FORMAT**:

\`\`\`json
{
  "abstractions": [
    {
      "name": "AbstractionName",
      "description": "Brief description of what this abstraction does and its purpose in the system",
      "category": "class|interface|pattern|component|service",
      "files": [0, 1, 2]
    },
    {
      "name": "AnotherAbstraction", 
      "description": "Another description",
      "category": "class|interface|pattern|component|service", 
      "files": [1, 3]
    }
  ]
}
\`\`\`

The "files" array should contain the index numbers of files (0-${inputData.filesData.length - 1}) that contain or implement this abstraction based on their ACTUAL CONTENT.
Provide 1-8 key abstractions that represent the most important concepts in this codebase.

Example analysis process:
- If File 0 contains a "UserController" class and File 3 contains "UserService" class, both might implement a "User Management" abstraction
- If File 1 contains database connection code and File 4 contains database queries, both might implement a "Database Layer" abstraction
- If File 2 only contains utility functions unrelated to major patterns, it might not be included in any abstraction`;

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        // Parse abstractions from JSON response
        const { abstractionsList, parsedAbstractions } = parseAbstractionsFromJSONResponse(response.text, inputData.filesData);

        // Validate that abstractions have meaningful file associations
        console.log("=== Validating Abstraction-File Associations ===");
        let totalFileAssociations = 0;
        parsedAbstractions.forEach((abstraction, index) => {
            totalFileAssociations += abstraction.files.length;
            if (abstraction.files.length === 0) {
                console.log(`⚠️  Warning: Abstraction "${abstraction.name}" has no associated files`);
            } else {
                console.log(`✅ Abstraction "${abstraction.name}" -> ${abstraction.files.length} files: [${abstraction.files.map(i => inputData.filesData[i]?.[0] || 'unknown').join(', ')}]`);
            }
        });
        
        console.log(`📊 Total abstractions: ${parsedAbstractions.length}, Total file associations: ${totalFileAssociations}`);
        console.log("=================================================");

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
                
                // Parse the files array, ensuring they are valid indices
                let files: number[] = [];
                if (Array.isArray(abstraction.files)) {
                    files = abstraction.files
                        .filter((fileIndex: any) => 
                            typeof fileIndex === 'number' && 
                            fileIndex >= 0 && 
                            fileIndex < filesData.length
                        );
                }
                
                // Only include abstractions that have valid file associations
                // Don't force arbitrary file assignments
                abstractionsList.push(name);
                parsedAbstractions.push({
                    name: name,
                    description: description,
                    files: files // Use actual files specified by the agent, even if empty
                });
                
                const fileNames = files.length > 0 
                    ? files.map(i => filesData[i]?.[0] || 'unknown').join(', ')
                    : 'no files specified';
                console.log(`✅ Parsed abstraction: "${name}" -> files [${files.join(', ')}] -> [${fileNames}]`);
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
            description: `Automatically extracted abstraction: ${name}. Note: File associations need manual analysis.`,
            files: [] // Don't assign arbitrary files in fallback - let manual analysis determine associations
        }));

        console.log("=== Fallback Abstraction Names (No File Associations) ===");
        console.log(fallbackNames);
        console.log("Warning: Automatic file association failed. Manual analysis recommended.");
        console.log("=========================================================");

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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Pass through filesData
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
                filesData: inputData.filesData, // Pass through filesData
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
                filesData: inputData.filesData, // Pass through filesData
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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Add filesData to input
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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Pass through filesData
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
                filesData: inputData.filesData, // Pass through filesData
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
                filesData: inputData.filesData, // Pass through filesData
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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Add filesData to input
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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Include files data in output
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

        // Use the actual files data from the repository
        const actualFilesData = inputData.filesData;

        // Prepare chapters data using our tool
        const chaptersToWrite = prepareChaptersData({
            chapterOrder: inputData.chapterOrder,
            abstractions: structuredAbstractions,
            filesData: actualFilesData, // Use actual files instead of mock
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
            filesData: inputData.filesData, // Pass through filesData
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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Add filesData to workflow output
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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Add filesData to input
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
        filesData: z.array(z.tuple([z.string(), z.string()])), // Add filesData to final output
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
        console.log("Files Analyzed:", inputData.filesData.map(([path]) => path));

        return {
            abstractions: inputData.abstractions,
            abstractionsList: inputData.abstractionsList,
            relationshipSummary: inputData.relationshipSummary,
            relationships: inputData.relationships,
            chapterOrder: inputData.chapterOrder,
            chapters: inputData.chapters,
            filesData: inputData.filesData, // Include filesData in final output
        };
    }
}));

sequentialPipeline.commit();
export { sequentialPipeline };