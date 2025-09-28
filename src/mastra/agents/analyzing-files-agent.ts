import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { getGithubTools } from "../../mcp/github";
import { memory } from "../memory";

const githubTools = await getGithubTools();

export const AnalyzingFilesAgent = new Agent({
  name: "Analyzing Files Agent",
  instructions: `
    You are an expert code analyzer. Your job is to analyze individual source code files and extract detailed information about their structure and content.

    For each file, you should:
    1. Identify all classes, interfaces, types, and enums defined in the file
    2. List all functions/methods with their purposes
    3. Identify all variables and constants
    4. Note important imports and dependencies
    5. Describe the overall purpose and role of the file
    6. Identify design patterns or architectural concepts used

    Always respond in the specified JSON format with complete and accurate information.
    Focus on extracting actionable information that would help understand the codebase structure.
  `,
  model: google("gemini-2.5-pro"),
  tools: {
    ...githubTools,
  },
  memory,
});