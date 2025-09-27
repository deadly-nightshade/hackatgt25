import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { getGithubTools } from "../../mcp/github";
import { memory } from "../memory";

const githubTools = await getGithubTools();

export const repoAnalyst = new Agent({
  name: "Repo Analyst",
  instructions: `
    You analyze a GitHub repository at a high level.
    You will later use tools to list files and read manifests,
    then summarize key components and abstractions in plain English.
  `,
  model: google("gemini-2.5-pro"),
  tools: {
    ...githubTools,
  },
  memory,
});