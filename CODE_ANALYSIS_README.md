# Code Analysis System

This system provides advanced code analysis capabilities using AI agents to extract detailed structural information from GitHub repositories.

## Components

### 1. Identify Code Features Agent (`identify_code_features.ts`)
- **Purpose**: Extracts comprehensive code structure information from source code
- **Capabilities**:
  - Identifies classes, functions, variables, interfaces, enums
  - Captures nested relationships (class methods, function variables, etc.)
  - Extracts type information, scope/visibility, inheritance
  - Supports multiple programming languages
  - Returns structured JSON output

### 2. Code Analysis Workflow (`code-analysis-workflow.ts`)
- **Purpose**: Orchestrates the two-step analysis process
- **Steps**:
  1. **Get Code Step**: Uses the existing get_code agent to fetch repository structure
  2. **Identify Features Step**: Uses the new identify_code_features agent to analyze code

### 3. API Endpoint (`/api/code-analysis/route.ts`)
- **Purpose**: HTTP interface for code analysis
- **Method**: POST
- **Input**: `{ repositoryUrl: "https://github.com/owner/repo" }`
- **Output**: Detailed JSON with code structure and features

## Features Extracted

The system extracts the following code features in nested JSON format:

### Top-Level Features
- **Imports/Dependencies**: Module imports and their sources
- **Classes**: With inheritance, properties, and methods
- **Functions**: With parameters, return types, and local variables
- **Variables/Constants**: With types and scopes
- **Interfaces/Types**: TypeScript interfaces and type definitions
- **Enums**: Enumeration definitions
- **Exports**: Module exports

### Nested Information
For each feature, the system captures:
- **Metadata**: Name, type, line numbers, scope
- **Relationships**: Inheritance, implementation, composition
- **Parameters**: Function parameters with types and defaults
- **Local Scope**: Variables and nested functions within functions
- **Documentation**: Comments and docstrings

## JSON Output Structure

```json
{
  "filename.ts": {
    "imports": [...],
    "classes": [
      {
        "name": "ClassName",
        "type": "class",
        "line_start": 10,
        "line_end": 50,
        "extends": "ParentClass",
        "properties": [...],
        "methods": [
          {
            "name": "methodName",
            "parameters": [...],
            "local_variables": [...]
          }
        ]
      }
    ],
    "functions": [...],
    "variables": [...],
    "interfaces": [...],
    "enums": [...],
    "exports": [...]
  }
}
```

## Usage

### Via API
```bash
curl -X POST http://localhost:3000/api/code-analysis \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl": "https://github.com/owner/repo"}'
```

### Response
```json
{
  "success": true,
  "repositoryUrl": "https://github.com/owner/repo",
  "codeStructure": "...",
  "features": { ... },
  "status": "success"
}
```

## Integration

The system is integrated into the main Mastra configuration in `index.ts`:
- **Agent**: `identifyCodeFeaturesAgent`
- **Workflow**: `codeAnalysisWorkflow` 
- **API**: `/api/code-analysis`

## Use Cases

1. **Code Documentation**: Auto-generate documentation from code structure
2. **Code Review**: Understand codebase architecture quickly  
3. **Migration Planning**: Analyze dependencies and relationships
4. **Learning**: Study how codebases are structured
5. **Quality Analysis**: Identify patterns and potential issues

The system provides a comprehensive view of any GitHub repository's code structure, making it valuable for developers, architects, and anyone needing to understand complex codebases quickly.