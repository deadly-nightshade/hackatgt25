import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from "zod";

const getCodeStep = createStep({
  id: "get-code",
  description: "Fetches code from a GitHub repository",
  inputSchema: z.object({
    repositoryUrl: z.string().describe("The GitHub repository URL to analyze"),
  }),
  outputSchema: z.object({
    codeStructure: z.string(),
    repositoryUrl: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const agent = mastra?.getAgent("testAgent");
    if (!agent) {
      throw new Error("Test Fetcher agent not found");
    }

    const result = await agent.generate([
      {
        role: "user",
        content: `Fetch ALL source code from this GitHub repository: ${inputData.repositoryUrl}

CRITICAL: Return ONLY valid JSON with the following structure:
{
  "repository_info": {
    "url": "${inputData.repositoryUrl}",
    "owner": "owner_name",
    "name": "repo_name" 
  },
  "files": {
    "path/to/file.js": "complete file content",
    "src/component.tsx": "complete file content",
    "README.md": "complete file content"
  }
}

Use the GitHub MCP tools to:
1. List all repository files
2. Fetch content for every source code file
3. Return the JSON structure with actual file contents

NO markdown formatting, NO explanations, ONLY the JSON object.`,
      },
    ]);

    return {
      codeStructure: result.text,
      repositoryUrl: inputData.repositoryUrl,
    };
  },
});

const identifyFeaturesStep = createStep({
  id: "identify-code-features",
  description: "Analyzes code structure and extracts all features in nested JSON format",
  inputSchema: z.object({
    codeStructure: z.string().describe("The code structure from the previous step"),
    repositoryUrl: z.string().describe("The repository URL for context"),
  }),
  outputSchema: z.object({
    features: z.any().describe("Extracted code features in JSON format"),
    repositoryUrl: z.string(),
    status: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const agent = mastra?.getAgent("identifyCodeFeaturesAgent");
    if (!agent) {
      throw new Error("Code Features Identifier agent not found");
    }

    // First, try to parse the code structure to get individual files
    let codeData;
    try {
      codeData = JSON.parse(inputData.codeStructure);
    } catch (parseError) {
      console.warn("Code structure is not valid JSON, treating as raw text");
      codeData = { files: { "unknown.txt": inputData.codeStructure } };
    }

    const result = await agent.generate([
      {
        role: "user",
        content: `Analyze the following repository code and extract ALL code features in the detailed nested JSON format specified in your instructions.

Repository: ${inputData.repositoryUrl}

Repository Structure: ${codeData.repository_info ? JSON.stringify(codeData.repository_info) : "Unknown"}

Files and their contents:
${JSON.stringify(codeData.files || codeData, null, 2)}

TASK: Extract ALL code features (classes, functions, variables, interfaces, enums, imports, exports) from EVERY file.

Return ONLY valid JSON in this exact format:
{
  "repository": "${inputData.repositoryUrl}",
  "analysis": {
    "filename1.js": {
      "imports": [...],
      "classes": [...],  
      "functions": [...],
      "variables": [...],
      "exports": [...]
    },
    "filename2.ts": {
      "imports": [...],
      "classes": [...],
      "functions": [...],
      "variables": [...],
      "exports": [...]
    }
  }
}

NO markdown, NO explanations, ONLY the JSON.`,
      },
    ]);

    // Parse the result to ensure it's valid JSON
    try {
      const featuresJson = JSON.parse(result.text);
      return {
        features: featuresJson,
        repositoryUrl: inputData.repositoryUrl,
        status: "success"
      };
    } catch (error) {
      // If parsing fails, return the raw text and error info
      return {
        features: result.text,
        repositoryUrl: inputData.repositoryUrl,
        status: "parsing_error",
        error: error instanceof Error ? error.message : "Unknown parsing error"
      };
    }
  },
});

const codeAnalysisWorkflow = createWorkflow({
  id: "code-analysis-workflow",
  inputSchema: z.object({
    repositoryUrl: z.string().describe("The GitHub repository URL to analyze"),
  }),
  outputSchema: z.object({
    features: z.any().describe("Extracted code features in JSON format"),
    repositoryUrl: z.string(),
    status: z.string(),
    error: z.string().optional(),
  }),
})
  .then(getCodeStep)
  .then(identifyFeaturesStep);

codeAnalysisWorkflow.commit();

export { codeAnalysisWorkflow };