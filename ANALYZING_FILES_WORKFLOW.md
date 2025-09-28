# Analyzing Files Workflow

## Overview
The "analyzing-files" workflow is designed to provide detailed, granular analysis of individual files in a GitHub repository. This workflow takes a different approach from the previous abstraction-focused analysis by examining each file's structure individually before attempting to group them into abstractions.

## Workflow Architecture

### Input
- **repoUrl**: GitHub repository URL (string)

### Steps

#### 1. **Fetch Repository Step**
- Uses `GitHubService` to fetch repository content from GitHub API
- Filters files by size (< 100KB) and type
- Limits to 20 files for detailed analysis (to prevent overwhelming)
- Provides repository overview using the `repoAnalyst` agent

#### 2. **Analyze Files Step**
- Uses the new `AnalyzingFilesAgent` to analyze each file individually
- Extracts detailed structural information from each file
- Processes files sequentially to avoid API rate limits
- Handles parsing errors gracefully with fallback analysis

#### 3. **Final Summary Step**
- Aggregates analysis results
- Provides comprehensive statistics
- Outputs detailed breakdown of findings

### Output Schema

```typescript
{
  repoContent: string,           // Repository metadata
  repoAnalysis: string,          // High-level repository analysis
  filesData: [string, string][], // Raw file paths and content
  analyzedFiles: AnalyzedFile[]   // Detailed analysis for each file
}
```

## AnalyzedFile Schema

Each analyzed file contains:

```json
{
  "filePath": "src/example.ts",
  "description": "Brief description of file purpose",
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
  "imports": ["module1", "./relative-import"],
  "exports": ["ExportedClass", "exportedFunction"],
  "designPatterns": ["Singleton", "Factory", "Observer"],
  "purpose": "Overall purpose and role of this file"
}
```

## Key Features

### 1. **Individual File Analysis**
- Each file is analyzed separately by the AI agent
- Detailed extraction of code structure
- Identification of classes, functions, interfaces, variables
- Recognition of design patterns and architectural concepts

### 2. **Comprehensive Metadata Extraction**
- **Classes**: Names, descriptions, methods, properties
- **Functions**: Names, descriptions, parameters
- **Interfaces**: Names, descriptions, properties  
- **Variables**: Names, types, descriptions
- **Dependencies**: Imports and exports
- **Patterns**: Design patterns and architectural concepts
- **Purpose**: Overall file role and responsibility

### 3. **Robust Error Handling**
- Graceful handling of JSON parsing failures
- Fallback analysis for failed file processing
- Detailed logging for debugging
- Continues processing other files even if some fail

### 4. **Structured Output**
- Well-defined TypeScript schemas
- Consistent data format across all files
- Easy to process for further analysis or UI display
- Statistics and summaries included

## Usage Example

```javascript
import { analyzingFilesWorkflow } from './workflows/analyzing-files-workflow';

const result = await analyzingFilesWorkflow.execute({
  repoUrl: 'https://github.com/username/repository'
});

// Access detailed file analysis
result.analyzedFiles.forEach(file => {
  console.log(`File: ${file.filePath}`);
  console.log(`Classes: ${file.classes.map(c => c.name).join(', ')}`);
  console.log(`Functions: ${file.functions.map(f => f.name).join(', ')}`);
  console.log(`Purpose: ${file.purpose}`);
});
```

## Benefits Over Previous Approach

### 1. **Accurate Structure Detection**
- Direct analysis of each file's actual content
- No guessing or arbitrary assignments
- Detailed breakdown of code elements

### 2. **Better Foundation for Abstraction**
- Rich data about each file's structure
- Clear understanding of what each file contains
- Easier to group related files into abstractions later

### 3. **Comprehensive Coverage**
- Analyzes classes, functions, interfaces, variables
- Identifies design patterns and architectural concepts
- Maps imports/exports for dependency understanding

### 4. **Debugging and Transparency**
- Clear logging of analysis process
- Detailed error handling and fallbacks
- Easy to see what was extracted from each file

## Next Steps

This workflow provides the foundation for more accurate abstraction identification. The detailed file analysis can be used to:

1. **Group Related Files**: Files with similar classes/functions can be grouped
2. **Identify Patterns**: Common design patterns across files
3. **Map Dependencies**: Understanding how files relate through imports/exports
4. **Generate Documentation**: Rich metadata for automatic documentation
5. **Educational Content**: Detailed structure for creating learning materials

## Integration

The workflow is integrated into the main Mastra instance and can be used alongside existing workflows:

- **Agent**: `AnalyzingFilesAgent` - Individual file analysis
- **Workflow**: `analyzingFilesWorkflow` - Complete repository analysis
- **Tools**: Uses existing GitHub MCP tools for repository access