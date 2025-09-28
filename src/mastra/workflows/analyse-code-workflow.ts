import { createStep, createWorkflow ,} from '@mastra/core/workflows';

import { z } from 'zod';

// Step 1: Fetch repository code and files
const fetchRepoCodeStep = createStep({
  id: 'fetch-repo-code-step',
  description: 'Fetch repository code files using fetch repo code agent',
  inputSchema: z.object({
    repoUrl: z.string().url(),
  }),
  outputSchema: z.object({
    filesDict: z.record(z.string(), z.any()), // Dictionary of files and their code contents
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('fetchCodeAgent');
    if (!agent) {
      throw new Error('fetchCodeAgent not found');
    }

    const prompt = `Repository: ${inputData.repoUrl}. Return a structured dictionary of files and their contents as specified in your instructions.`;

    const response = await agent.generate([
      { role: 'user', content: prompt }
    ], {temperature: 0});

    // Parse the response to extract the files dictionary
    let filesDict: Record<string, any> = {};
    try {
      // Try to parse JSON response
      let hold = response.text.substring(response.text.indexOf('{'), response.text.lastIndexOf('}') + 1);
      console.log(hold);
      filesDict = JSON.parse(hold);
    } catch (error) {
      console.error('Failed to parse files dictionary, using fallback structure');
      // Fallback: create a simple structure from the response text
      filesDict = {
        'analysis': response.text
      };
      console.log(response);
    }

    return {
      filesDict
    };
  }
});

// Step 2: Analyze the fetched code files
const analyzeCodeStep = createStep({
  id: 'analyze-code-step', 
  description: 'Analyze code files using analyze code agent',
  inputSchema: z.object({
    filesDict: z.record(z.string(), z.any()),
  }),
  outputSchema: z.object({
    files: z.record(z.string(), z.any()),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('analyseCodeAgent');
    if (!agent) {
      throw new Error('analyseCodeAgent not found');
    }    

    
    const files = inputData.filesDict;
    // Flatten the files dictionary into a format suitable for analysis
    const filesForAnalysis = Object.entries(files);
    
    for (const [path, content] of filesForAnalysis) {
      const prompt = `File and code to analyze: ${path}:\n${content}\n`;
        const response = await agent.generate([
      { role: 'user', content: prompt }
    ], {temperature: 0});
    try {
        const hold = response.text.substring(response.text.indexOf('{'), response.text.lastIndexOf('}') + 1);
        console.log(hold);
      files[path] = JSON.parse(hold);
    } catch (error) {
      console.error(`Failed to parse analysis result for coding file: ${path}`, error);
      files[path] = {}; // Leave empty and move onto the next one
      continue;
    }
};
return {files}
}});

// Create the workflow with both steps
const analyseCodeWorkflow = createWorkflow({
  id: 'read-code-workflow',
  inputSchema: z.object({
    repoUrl: z.string().url(),
  }),
  outputSchema: z.object({
    files: z.record(z.string(), z.any()),
}),
})
  .then(fetchRepoCodeStep)
  .then(analyzeCodeStep)

analyseCodeWorkflow.commit();

export { analyseCodeWorkflow };