import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { testAgent } from '../agents/test_agent';

const analyzeRepositoryStep = createStep({
    id: "analyze-repository-step",
    description: "Analyze GitHub repository using test agent",
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
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        console.log(`=== Analyzing repository: ${inputData.repoUrl} ===`);

        try {
            // Parse GitHub URL to extract owner and repo
            const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
            const match = inputData.repoUrl.match(urlPattern);
            
            if (!match) {
                throw new Error("Invalid GitHub URL format. Expected: https://github.com/owner/repo");
            }

            const [, owner, repo] = match;
            console.log(`Repository: ${owner}/${repo}`);

            // Try to get the test agent
            const agent = mastra?.getAgent('testAgent');
            
            if (!agent) {
                console.log("testAgent not found, using fallback analysis");
                // Fallback: return basic analysis without agent
                return {
                    repositoryName: `${owner}/${repo}`,
                    repositoryDescription: "Repository analysis using fallback method (agent not available)",
                    fileStructure: `Repository: ${owner}/${repo}\nAnalysis performed without GitHub MCP access`,
                    mainComponents: "Unable to analyze components without GitHub access",
                    summary: `Basic analysis of ${owner}/${repo}. Full analysis requires GitHub MCP configuration.`
                };
            }

            // Simplify the prompt to avoid API issues
            const prompt = `Analyze the GitHub repository: ${owner}/${repo}

Repository URL: ${inputData.repoUrl}

Please provide a brief analysis including:
1. Repository information
2. File structure overview
3. Main components
4. Technologies used

Keep the response concise and in plain text format.`;

            console.log("Sending request to test agent...");
            let response;
            try {
                response = await agent.generate([
                    { role: 'user', content: prompt }
                ]);
                console.log("Response received, text length:", response.text?.length || 0);
            } catch (apiError) {
                console.error("API Error details:", apiError);
                // Fallback to basic analysis if API fails
                return {
                    repositoryName: `${owner}/${repo}`,
                    repositoryDescription: `API Error: ${(apiError as Error).message}`,
                    fileStructure: "Could not fetch file structure due to API error",
                    mainComponents: "Could not analyze components due to API error",
                    summary: `Analysis failed for ${owner}/${repo} due to API issues: ${(apiError as Error).message}`
                };
            }

            if (!response || !response.text) {
                throw new Error("Invalid response format from agent");
            }

            console.log("Analysis completed successfully");

            // Extract key information from the response
            const analysisText = response.text;
            
            // Try to extract specific sections from the analysis
            const repositoryName = extractSection(analysisText, "Repository Name", "Name") || `${owner}/${repo}`;
            const repositoryDescription = extractSection(analysisText, "Description", "Overview") || "No description available";
            const fileStructure = extractSection(analysisText, "File Structure", "Structure") || "File structure analysis not available";
            const mainComponents = extractSection(analysisText, "Main Components", "Components", "Technologies") || "Component analysis not available";

            return {
                repositoryName,
                repositoryDescription,
                fileStructure,
                mainComponents,
                summary: analysisText
            };

        } catch (error) {
            console.error("Failed to analyze repository:", error);
            
            // Return error information
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

// Helper function to extract sections from the analysis text
function extractSection(text: string, ...sectionNames: string[]): string {
    for (const sectionName of sectionNames) {
        // Try different patterns to find the section
        const patterns = [
            new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i'),
            new RegExp(`##?\\s*${sectionName}:?\\s*([\\s\\S]*?)(?=\\n##?|\\n[A-Z]|$)`, 'i'),
            new RegExp(`\\*\\*${sectionName}:?\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n[A-Z]|$)`, 'i')
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    }
    return "";
}

const testWorkflow = createWorkflow({
    id: "test-repository-analysis-workflow",
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
   .then(analyzeRepositoryStep)
   .then(createStep({
        id: "final-output-step",
        description: "Format and display final analysis results",
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

            console.log("=== Repository Analysis Results ===");
            console.log(`Repository: ${inputData.repositoryName}`);
            console.log(`Description: ${inputData.repositoryDescription}`);
            console.log("\n=== File Structure ===");
            console.log(inputData.fileStructure);
            console.log("\n=== Main Components ===");
            console.log(inputData.mainComponents);
            console.log("\n=== Full Analysis ===");
            console.log(inputData.summary);
            console.log("=====================================");

            return {
                repositoryName: inputData.repositoryName,
                repositoryDescription: inputData.repositoryDescription,
                fileStructure: inputData.fileStructure,
                mainComponents: inputData.mainComponents,
                summary: inputData.summary
            };
        }
    }));

testWorkflow.commit();
export { testWorkflow };