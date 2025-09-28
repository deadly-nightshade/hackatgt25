import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { memory } from '../memory';

/**
 * FindOutput Agent
 * Purpose: produce a structured JSON output combining:
 * - abstractions (from identify_abstractions agent output stored in memory)
 * - relationships (from analyse_relations agent output stored in memory)
 * - chapters (markdown outputs produced by write_chapter agent)
 *
 * The agent's instructions ask the model to fetch and format available outputs
 * into a single well-structured JSON object with keys: abstractions, relationships, chapters
 */
export const FindOutputAgent = new Agent({
    name: 'FindOutput Agent',
    instructions: 'You are an assistant that aggregates previous agent outputs into a single JSON structure.\n\nCollect and return the following keys as valid JSON:\n\n- repository_url: the repository URL supplied by the user (string) or empty string if not provided\n- abstractions: array of objects with name, description, category, file_indices\n- relationships: array of relationship objects (from/to/label)\n- chapters: mapping of abstraction name -> chapter markdown string (or array of strings)\n\nIf any of the outputs are missing, return empty arrays/objects and include a top-level "notes" field explaining what is missing.\n\nReturn ONLY valid JSON in the response. Do NOT include any surrounding commentary or markdown fences.',
    model: google('gemini-2.5-flash'),
    tools: {},
    memory,
});

export default FindOutputAgent;
