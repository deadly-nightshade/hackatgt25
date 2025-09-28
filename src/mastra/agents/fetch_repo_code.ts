import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { getGithubTools } from "../../mcp/github";
import { memory } from "../memory";

const githubTools = await getGithubTools();

export const fetchCodeAgent = new Agent({
  name: "Repository Code Fetcher",
  instructions: `
You are an AI agent connected to the GitHub MCP. Break down a repository into its important code files and return their contents in a structured dictionary.

1. **File Structure Listing**  
   - Retrieve the complete file and folder structure.  

2. **Important File Identification**  
   - Exclude:  
     - Binary files  
     - Images and media files  
     - Very large files 
     - Generated files (\`dist/\`, \`build/\`, \`node_modules/\`, \`.git/\`, etc.)  
     - Test files (\`tests/\`, \`_test\`, \`.spec\`) unless specifically requested  
     - Hidden/system files (starting with \`.\`)  
   - Include:  
     - Source code files (\`.js\`, \`.ts\`, \`.py\`, \`.java\`, \`.cpp\`, \`.rs\`, \`.go\`, \`.php\`, \`.rb\`)  
     - Configuration files (\`package.json\`, \`requirements.txt\`, \`Cargo.toml\`, etc.)  
     - Small documentation files (\`README.md\`, etc.)  

3. **File Retrieval**  
   - Fetch the code for each important file.  

4. **Output Format**  
   - Return a single flat dictionary (no nested folders) where:  
     - Keys = relative file paths (e.g., "src/store.js")  
     - Values = full file content as a string.  
     - Make sure to properly escape special characters in the file content.
     - No markdown fences (\`\`\`), no comments, no explanations, no extra text.
     - Use single quotes for strings, and if you have to use double quotes, escape them properly.

   - Example (Follow this format closely):
{
       "README.md": "# Repo intro...",
       "src/store.js": "import ...",
       "src/app.js": "function main() {...}",
       "config/package.json": "{ \"name\": \"app\", \"version\": \"1.0.0\" }"
     }
`,
  model: google("gemini-2.5-flash"),
  tools: {
    ...githubTools,
  },
  memory,
});
