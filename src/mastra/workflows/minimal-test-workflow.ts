import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Minimal test workflow that doesn't use agents to isolate the issue
const minimalAnalysisStep = createStep({
    id: "minimal-analysis-step",
    description: "Minimal GitHub repository analysis without agents",
    inputSchema: z.object({
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        repositoryName: z.string(),
        repositoryDescription: z.string(),
        fileStructure: z.string(),
        mainComponents: z.string(),
        summary: z.string(),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        console.log(`=== Analyzing repository (minimal): ${inputData.repoUrl} ===`);

        try {
            // Parse GitHub URL to extract owner and repo
            const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
            const match = inputData.repoUrl.match(urlPattern);
            
            if (!match) {
                throw new Error("Invalid GitHub URL format. Expected: https://github.com/owner/repo");
            }

            const [, owner, repo] = match;
            const repoName = `${owner}/${repo}`;
            
            console.log(`Repository: ${repoName}`);

            // Return basic analysis without calling external APIs
            return {
                repositoryName: repoName,
                repositoryDescription: `Repository ${repoName} - Basic analysis without GitHub API access`,
                fileStructure: `File structure analysis would require GitHub MCP access.\nRepository: ${repoName}\nOwner: ${owner}\nRepo: ${repo}`,
                mainComponents: `Main components analysis would require code access.\nThis is a placeholder for ${repoName}`,
                summary: `Basic analysis completed for ${repoName}.\n\nThis workflow successfully:\n1. Parsed the GitHub URL\n2. Extracted owner (${owner}) and repo (${repo})\n3. Created structured output\n\nTo get full analysis, GitHub MCP tools would be needed.`
            };

        } catch (error) {
            console.error("Failed to analyze repository:", error);
            
            return {
                repositoryName: "Analysis Failed",
                repositoryDescription: `Failed to analyze repository: ${(error as Error).message}`,
                fileStructure: "Could not retrieve file structure",
                mainComponents: "Could not identify main components",
                summary: `Error occurred during analysis: ${(error as Error).message}\n\nRepository URL: ${inputData.repoUrl}`
            };
        }
    }
});

const minimalTestWorkflow = createWorkflow({
    id: "minimal-test-repository-analysis-workflow",
    inputSchema: z.object({
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        repositoryName: z.string(),
        repositoryDescription: z.string(),
        fileStructure: z.string(),
        mainComponents: z.string(),
        summary: z.string(),
    }),
})
   .then(minimalAnalysisStep)
   .then(createStep({
        id: "final-output-step",
        description: "Display final results",
        inputSchema: z.object({
            repositoryName: z.string(),
            repositoryDescription: z.string(),
            fileStructure: z.string(),
            mainComponents: z.string(),
            summary: z.string(),
        }),
        outputSchema: z.object({
            repositoryName: z.string(),
            repositoryDescription: z.string(),
            fileStructure: z.string(),
            mainComponents: z.string(),
            summary: z.string(),
        }),
        execute: async ({ inputData }) => {
            if (!inputData) {
                throw new Error("Input data not found");
            }

            console.log("=== Minimal Test Results ===");
            console.log(`Repository: ${inputData.repositoryName}`);
            console.log(`Description: ${inputData.repositoryDescription}`);
            console.log("\n=== File Structure ===");
            console.log(inputData.fileStructure);
            console.log("\n=== Main Components ===");
            console.log(inputData.mainComponents);
            console.log("\n=== Summary ===");
            console.log(inputData.summary);
            console.log("============================");

            return inputData;
        }
    }));

minimalTestWorkflow.commit();
export { minimalTestWorkflow };