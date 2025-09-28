import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { repoAnalyst } from "../agents/fetch_repo";
import { AnalyzingFilesAgent } from "../agents/analyzing-files-agent";
import { GitHubService } from "../../services/github-service";

// Define the schema for analyzed file information
const AnalyzedFileSchema = z.object({
  filePath: z.string(),
  description: z.string(),
  classes: z.array(z.object({
    name: z.string(),
    description: z.string(),
    methods: z.array(z.string()).optional(),
    properties: z.array(z.string()).optional(),
  })),
  interfaces: z.array(z.object({
    name: z.string(),
    description: z.string(),
    properties: z.array(z.string()).optional(),
  })),
  functions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.array(z.string()).optional(),
  })),
  variables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
  })),
  imports: z.array(z.string()),
  exports: z.array(z.string()),
  designPatterns: z.array(z.string()),
  purpose: z.string(),
});

const fetchRepoStep = createStep({
  id: "fetch-repo-step",
  description: "Fetch repository files from GitHub URL",
  inputSchema: z.object({
    repoUrl: z.string().url(),
  }),
  outputSchema: z.object({
    repoContent: z.string(),
    repoAnalysis: z.string(),
    filesData: z.array(z.tuple([z.string(), z.string()])),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    console.log(`=== Fetching repository data from: ${inputData.repoUrl} ===`);

    // Initialize GitHub service
    const githubService = new GitHubService();
    
    try {
      // Fetch real repository data
      const repoData = await githubService.parseRepository(inputData.repoUrl);
      
      console.log(`Found ${repoData.files.length} files in repository: ${repoData.name}`);
      
      // Convert to the expected format
      const filesData: Array<[string, string]> = repoData.files
        .filter(file => file.content && file.content.length < 100000) // Limit file size
        .map(file => [file.path, file.content || ''] as [string, string])
        .slice(0, 20); // Limit to first 20 files for detailed analysis
      
      console.log(`Selected ${filesData.length} files for analysis`);
      console.log('Files selected:', filesData.map(([path]) => path));

      // Use the agent for high-level analysis
      const agent = mastra?.getAgent('repoAnalyst');
      if (!agent) {
        throw new Error("repoAnalyst agent not found");
      }

      const prompt = `Analyze this GitHub repository: ${repoData.name}
      
Description: ${repoData.description}
Main Language: ${repoData.language}
Total Files: ${filesData.length}

Provide a brief overview of the repository structure and purpose.`;

      const response = await agent.generate([
        { role: 'user', content: prompt }
      ]);

      return { 
        repoContent: `Repository: ${repoData.name}\nDescription: ${repoData.description}\nLanguage: ${repoData.language}\nFiles: ${filesData.length}`,
        repoAnalysis: response.text,
        filesData: filesData
      };
      
    } catch (error) {
      console.error("Failed to fetch repository data:", error);
      console.log("🔄 Falling back to mock data...");
      
      // Fallback to mock data if GitHub API fails
      const mockFilesData: Array<[string, string]> = [
        ["src/main.ts", "// Main application file\nexport class App {\n  start() {\n    console.log('Starting app');\n  }\n}"],
        ["src/config.ts", "// Configuration file\nexport const config = {\n  port: 3000,\n  database: 'mongodb://localhost'\n};"],
        ["src/utils.ts", "// Utility functions\nexport function formatDate(date: Date): string {\n  return date.toISOString();\n}"],
      ];

      const agent = mastra?.getAgent('repoAnalyst');
      if (!agent) {
        throw new Error("repoAnalyst agent not found");
      }

      const prompt = `Analyze the GitHub repository at: ${inputData.repoUrl}. Note: Using fallback mock data due to API issues.`;
      const response = await agent.generate([
        { role: 'user', content: prompt }
      ]);

      return { 
        repoContent: response.text,
        repoAnalysis: response.text,
        filesData: mockFilesData
      };
    }
  }
});

const analyzeFilesStep = createStep({
  id: "analyze-files-step",
  description: "Analyze each file individually to extract detailed structure information",
  inputSchema: z.object({
    repoContent: z.string(),
    repoAnalysis: z.string(),
    filesData: z.array(z.tuple([z.string(), z.string()])),
  }),
  outputSchema: z.object({
    repoContent: z.string(),
    repoAnalysis: z.string(),
    filesData: z.array(z.tuple([z.string(), z.string()])),
    analyzedFiles: z.array(AnalyzedFileSchema),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const agent = mastra?.getAgent('AnalyzingFilesAgent');
    if (!agent) {
      throw new Error("AnalyzingFilesAgent not found");
    }

    console.log(`=== Analyzing ${inputData.filesData.length} files individually ===`);

    const analyzedFiles: Array<z.infer<typeof AnalyzedFileSchema>> = [];

    // Analyze each file individually
    for (let i = 0; i < inputData.filesData.length; i++) {
      const [filePath, fileContent] = inputData.filesData[i];
      
      console.log(`📁 Analyzing file ${i + 1}/${inputData.filesData.length}: ${filePath}`);

      try {
        const prompt = `Analyze this source code file and extract detailed structural information.

File: ${filePath}
Content:
\`\`\`
${fileContent}
\`\`\`

Please provide a comprehensive analysis in the following JSON format:

\`\`\`json
{
  "filePath": "${filePath}",
  "description": "Brief description of what this file does and its role in the system",
  "classes": [
    {
      "name": "ClassName",
      "description": "What this class does",
      "methods": ["method1", "method2"],
      "properties": ["prop1", "prop2"]
    }
  ],
  "interfaces": [
    {
      "name": "InterfaceName",
      "description": "What this interface defines",
      "properties": ["prop1", "prop2"]
    }
  ],
  "functions": [
    {
      "name": "functionName",
      "description": "What this function does",
      "parameters": ["param1: type", "param2: type"]
    }
  ],
  "variables": [
    {
      "name": "variableName",
      "type": "variableType",
      "description": "What this variable is used for"
    }
  ],
  "imports": ["module1", "module2", "./relative-import"],
  "exports": ["ExportedClass", "exportedFunction"],
  "designPatterns": ["Singleton", "Factory", "Observer"],
  "purpose": "Overall purpose and role of this file in the application architecture"
}
\`\`\`

Focus on:
- All defined classes, interfaces, types, and enums
- All functions with their purposes
- Important variables and constants
- Key imports and what they're used for
- Exported functionality
- Design patterns or architectural concepts
- The file's role in the overall system

Be thorough but concise. If a section doesn't apply (e.g., no classes), return an empty array.`;

        const response = await agent.generate([
          { role: 'user', content: prompt }
        ]);

        // Parse the JSON response
        const analysisResult = parseFileAnalysisResponse(response.text, filePath);
        analyzedFiles.push(analysisResult);
        
        console.log(`✅ Successfully analyzed ${filePath}`);
        console.log(`   - Classes: ${analysisResult.classes.length}`);
        console.log(`   - Functions: ${analysisResult.functions.length}`);
        console.log(`   - Interfaces: ${analysisResult.interfaces.length}`);
        
      } catch (error) {
        console.error(`❌ Failed to analyze ${filePath}:`, error);
        
        // Create a fallback analysis
        const fallbackAnalysis: z.infer<typeof AnalyzedFileSchema> = {
          filePath: filePath,
          description: `Analysis failed for ${filePath}. Manual review required.`,
          classes: [],
          interfaces: [],
          functions: [],
          variables: [],
          imports: [],
          exports: [],
          designPatterns: [],
          purpose: `File analysis failed. Content length: ${fileContent.length} characters.`
        };
        
        analyzedFiles.push(fallbackAnalysis);
      }
    }

    console.log(`=== File analysis complete: ${analyzedFiles.length} files analyzed ===`);
    
    return {
      repoContent: inputData.repoContent,
      repoAnalysis: inputData.repoAnalysis,
      filesData: inputData.filesData,
      analyzedFiles: analyzedFiles
    };
  }
});

// Helper function to parse file analysis response
function parseFileAnalysisResponse(responseText: string, filePath: string): z.infer<typeof AnalyzedFileSchema> {
  console.log(`=== Parsing analysis for ${filePath} ===`);
  
  try {
    // Extract JSON from response
    let jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)\n\s*```/);
    if (!jsonMatch) {
      // Try without code blocks
      jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonMatch[1] = jsonMatch[0];
      }
    }
    
    if (!jsonMatch) {
      throw new Error("No JSON block found in response");
    }

    const jsonData = JSON.parse(jsonMatch[1]);
    
    // Validate and structure the response
    const analyzedFile: z.infer<typeof AnalyzedFileSchema> = {
      filePath: jsonData.filePath || filePath,
      description: jsonData.description || "No description provided",
      classes: Array.isArray(jsonData.classes) ? jsonData.classes : [],
      interfaces: Array.isArray(jsonData.interfaces) ? jsonData.interfaces : [],
      functions: Array.isArray(jsonData.functions) ? jsonData.functions : [],
      variables: Array.isArray(jsonData.variables) ? jsonData.variables : [],
      imports: Array.isArray(jsonData.imports) ? jsonData.imports : [],
      exports: Array.isArray(jsonData.exports) ? jsonData.exports : [],
      designPatterns: Array.isArray(jsonData.designPatterns) ? jsonData.designPatterns : [],
      purpose: jsonData.purpose || "Purpose not specified"
    };
    
    return analyzedFile;
    
  } catch (error) {
    console.error(`❌ Failed to parse JSON for ${filePath}:`, error);
    
    // Fallback: Create basic analysis from the response text
    return {
      filePath: filePath,
      description: `Analysis parsing failed. Raw response: ${responseText.substring(0, 200)}...`,
      classes: [],
      interfaces: [],
      functions: [],
      variables: [],
      imports: [],
      exports: [],
      designPatterns: [],
      purpose: "Failed to parse analysis response"
    };
  }
}

const analyzingFilesWorkflow = createWorkflow({
  id: "analyzing-files-workflow",
  inputSchema: z.object({
    repoUrl: z.string().url(),
  }),
  outputSchema: z.object({
    repoContent: z.string(),
    repoAnalysis: z.string(),
    filesData: z.array(z.tuple([z.string(), z.string()])),
    analyzedFiles: z.array(AnalyzedFileSchema),
  }),
})
  .then(fetchRepoStep)
  .then(analyzeFilesStep)
  .then(createStep({
    id: "final-summary-step",
    description: "Create final summary of file analysis results",
    inputSchema: z.object({
      repoContent: z.string(),
      repoAnalysis: z.string(),
      filesData: z.array(z.tuple([z.string(), z.string()])),
      analyzedFiles: z.array(AnalyzedFileSchema),
    }),
    outputSchema: z.object({
      repoContent: z.string(),
      repoAnalysis: z.string(),
      filesData: z.array(z.tuple([z.string(), z.string()])),
      analyzedFiles: z.array(AnalyzedFileSchema),
    }),
    execute: async ({ inputData }) => {
      if (!inputData) {
        throw new Error("Input data not found");
      }

      console.log("=== File Analysis Summary ===");
      console.log(`Repository analyzed: ${inputData.filesData.length} files`);
      
      let totalClasses = 0;
      let totalFunctions = 0;
      let totalInterfaces = 0;
      
      inputData.analyzedFiles.forEach((file, index) => {
        totalClasses += file.classes.length;
        totalFunctions += file.functions.length;
        totalInterfaces += file.interfaces.length;
        
        console.log(`📁 File ${index}: ${file.filePath}`);
        console.log(`   Purpose: ${file.purpose.substring(0, 100)}...`);
        console.log(`   Classes: ${file.classes.length}, Functions: ${file.functions.length}, Interfaces: ${file.interfaces.length}`);
        
        if (file.designPatterns.length > 0) {
          console.log(`   Design Patterns: ${file.designPatterns.join(', ')}`);
        }
      });
      
      console.log("=== Overall Statistics ===");
      console.log(`📊 Total Classes: ${totalClasses}`);
      console.log(`🔧 Total Functions: ${totalFunctions}`);
      console.log(`📋 Total Interfaces: ${totalInterfaces}`);
      console.log(`📁 Files Analyzed: ${inputData.analyzedFiles.length}`);
      console.log("=============================");

      return inputData;
    }
  }));

analyzingFilesWorkflow.commit();
export { analyzingFilesWorkflow };