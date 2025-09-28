import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';

export const getInstructions = ({
  maxAbstractionNum = 7,
  templateStyle = 'json'
} = {}) => `You are an expert at analyzing codebases and identifying core abstractions.
Your task is to identify the most important abstractions in a codebase (up to ${maxAbstractionNum}).

For each abstraction, provide:
1. A concise name (DO NOT append language tags like {javascript}, {python}, {typescript} — produce a plain name only)
2. A clear description with a simple analogy
3. A category classification
4. A list of relevant file indices

Format the output EXACTLY as this ${templateStyle} template:

{
  "abstractions": [
    {
      "name": "AbstractionName",
      "description": "Explains what the abstraction does. It's like <analogy to help understand>.",
      "category": "class|interface|pattern|component|service",
      "file_indices": [0, 3]
    }
  ]
}

For example:
{
  "abstractions": [
    {
      "name": "QueryProcessor{typescript}",
      "description": "Handles parsing and processing of user queries. It's like a mail sorting room that directs letters to the right department.{backend}",
      "category": "service",
      "file_indices": [0, 3]
    }
  ]
}

Focus on identifying high-level patterns and concepts that would help newcomers understand the system.
Do NOT append language hints or braces (e.g., {javascript}) to names or descriptions; keep names and descriptions plain.`;

export const IdentifyAbstractionAgent = new Agent({
    name: 'Identify Abstractions Agent',
    instructions: getInstructions(),
    model: google('gemini-2.5-flash'),
    tools: {},
    memory,
});