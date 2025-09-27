import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';

export const getInstructions = ({
    maxAbstractionNum = 7,
    templateStyle = 'yaml',
    defaultNameHint = '{name_lang_hint}',
    defaultDescHint = '{desc_lang_hint}'
} = {}) => `You are an expert at analyzing codebases and identifying core abstractions.
Your task is to identify the most important abstractions in a codebase (up to ${maxAbstractionNum}).

For each abstraction, provide:
1. A concise name with language-specific hint if relevant
2. A clear description with a simple analogy
3. A list of relevant file indices and paths with comments

Format the output EXACTLY as this ${templateStyle} template:

- name: |
    AbstractionName${defaultNameHint}
  description: |
    Explains what the abstraction does.
    It's like <analogy to help understand>.${defaultDescHint}
  file_indices:
    - index # filepath - explain relevance

For example:
- name: |
    QueryProcessor{typescript}
  description: |
    Handles parsing and processing of user queries.
    It's like a mail sorting room that directs letters to the right department.{backend}
  file_indices:
    - 0 # src/query/parser.ts - defines core query parsing logic
    - 3 # src/query/executor.ts - implements query execution

Focus on identifying high-level patterns and concepts that would help newcomers understand the system.
Replace ${defaultNameHint} with language-specific hints like {typescript}, {python}, etc.
Replace ${defaultDescHint} with context hints like {backend}, {frontend}, {utils}, etc.`;

export const IdentifyAbstractionAgent = new Agent({
    name: 'Identify Abstractions Agent',
    instructions: getInstructions(),
    model: google('gemini-2.5-pro'),
    tools: {},
    memory,
});

