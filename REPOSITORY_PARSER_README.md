# Repository Structure Generator Setup

This document explains how to set up and use the Repository Structure Generator functionality.

## Overview

The Repository Structure Generator creates comprehensive JSON structures mapping out GitHub repository folder and file hierarchies. It uses direct GitHub API calls and programmatic data transformation - **no AI required**.

The generator creates a clean, nested JSON structure containing:

- Complete folder hierarchy with proper nesting
- File metadata (name, path, extension, language, size)
- Repository statistics (total files, folders, main language)
- Organized structure ready for navigation and analysis

## Setup

### 1. Environment Variables

Optional: Add a GitHub token for higher API rate limits:

```bash
GITHUB_TOKEN=your_github_token_here
```

**Note:** No AI API keys required - this uses pure programmatic processing.

### 2. Files Created

The following files have been created for the repository structure generator:

- `src/services/github-service.ts` - GitHub API service with folder structure builder
- `src/app/api/parse-repo/route.ts` - API endpoint for structure generation
- `src/components/RepositoryAnalyzer.tsx` - Frontend component

## Usage

### Via Web Interface

1. Start the development server: `npm run dev`
2. Navigate to the application
3. Go to "Process Repository!" from the sidebar
4. Scroll down to the "Repository Structure Generator" section
5. Enter a GitHub repository URL
6. Click "Generate Structure" to create the JSON structure

### Via API

Send a POST request to `/api/parse-repo`:

```javascript
const response = await fetch('/api/parse-repo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    repoUrl: 'https://github.com/owner/repository' 
  }),
});

const data = await response.json();
console.log(data.data.parsedStructure);
```

### Expected Output Structure

The generator creates a JSON structure like this:

```json
{
  "repository": {
    "name": "repository-name",
    "description": "Repository description", 
    "mainLanguage": "typescript",
    "totalFiles": 25,
    "totalFolders": 8,
    "structure": {
      "src": {
        "type": "folder",
        "path": "src",
        "files": [
          {
            "name": "index.ts",
            "path": "src/index.ts",
            "extension": "ts",
            "language": "typescript",
            "sizeBytes": 1024
          }
        ],
        "folders": {
          "components": {
            "type": "folder",
            "path": "src/components",
            "files": [
              {
                "name": "Button.tsx",
                "path": "src/components/Button.tsx",
                "extension": "tsx", 
                "language": "typescript",
                "sizeBytes": 512
              }
            ],
            "folders": {}
          }
        }
      }
    }
  }
}
```

## Limitations

- Supports repositories up to reasonable sizes (avoids files >50KB for content fetching)
- GitHub API rate limits apply (use GitHub token for higher limits)
- Filters out common build/cache directories automatically## Extending the Generator

To extend the generator for new languages or patterns:

1. Update `GitHubService.getLanguageFromPath()` to support new file extensions
2. Modify filtering logic in `shouldIncludeFile()` for new file types
3. Add custom metadata extraction as needed

## Troubleshooting

- **Rate Limits**: Add a `GITHUB_TOKEN` environment variable
- **Large Repositories**: The generator automatically filters out large files and common ignore patterns
- **Structure Errors**: Check the browser console or server logs for detailed error messages
- **Missing Files**: Some files may be filtered out intentionally (build artifacts, etc.)