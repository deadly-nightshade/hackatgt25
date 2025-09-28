import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { GitHubService, GitHubFile } from '../../services/github-service';

const inputSchema = z.object({
  repoUrl: z.string().url().describe('GitHub repository URL to analyze'),
});

const outputSchema = z.object({
  message: z.string().describe('Simple message with JSON output'),
});

const parseRepositoryStep = createStep({
  id: 'parse-repository',
  inputSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    const githubService = new GitHubService();
    
    // Fetch repository data
    const repoData = await githubService.parseRepository(inputData.repoUrl);
    
    // Build folder structure programmatically (no AI needed)
    const folderStructure = githubService.buildFolderStructure(repoData);
    
    // Create simple message with JSON
    const message = `Hi! Here is your output in the JSON format.\n\n${JSON.stringify(folderStructure, null, 2)}`;
    
    return {
      message,
    };
  },
});

const repositoryParserWorkflow = createWorkflow({
  id: 'repository-parser-workflow',
  inputSchema,
  outputSchema,
})
  .then(parseRepositoryStep);

repositoryParserWorkflow.commit();

export { repositoryParserWorkflow };