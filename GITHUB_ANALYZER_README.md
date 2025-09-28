# GitHub Repository Analyzer

A standalone TypeScript utility that uses the GitHub API to fetch complete repository structure and file contents without AI dependencies. This tool extracts all files, directories, and their contents into a structured JSON format.

## Features

- 🚀 **Direct GitHub API Integration** - No AI or Mastra dependencies
- 📁 **Complete File Structure** - Recursively fetches all directories and files
- 📄 **File Content Extraction** - Downloads and stores content of all files
- 🔒 **Rate Limit Aware** - Respects GitHub API rate limits
- 💾 **JSON Export** - Saves results in structured JSON format
- 🛠️ **CLI Interface** - Easy command-line usage
- 📊 **Rich Metadata** - Includes file sizes, paths, and repository information

## Installation

The required dependencies are already included in this project:

```bash
npm install @octokit/rest commander dotenv
```

## Setup

1. **GitHub Token (Recommended)**
   
   Create a GitHub Personal Access Token for higher rate limits:
   
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with `public_repo` scope (or `repo` for private repos)
   - Add to your `.env` file:
   
   ```bash
   GITHUB_TOKEN=your_github_token_here
   ```

## Usage

### Command Line Interface

#### Analyze a Repository

```bash
# Using npm scripts
npm run analyze-repo https://github.com/owner/repo

# With custom options
npm run analyze-repo https://github.com/owner/repo -- --branch develop --output my-analysis.json

# Validate your GitHub token
npm run validate-github-token
```

#### CLI Options

```bash
Usage: github-analyzer analyze [options] <url>

Options:
  -t, --token <token>     GitHub personal access token
  -b, --branch <branch>   Branch to analyze (defaults to repository default)
  -o, --output <path>     Output file path for JSON results
  --no-save              Don't save results to file
  -h, --help             Display help
```

### Programmatic Usage

#### Quick Analysis

```typescript
import { analyzeGitHubRepository } from './src/github-analyzer';

const analysis = await analyzeGitHubRepository(
  'https://github.com/microsoft/TypeScript',
  {
    token: process.env.GITHUB_TOKEN, // Optional but recommended
    branch: 'main',                   // Optional, defaults to repo default
    saveToFile: true,                // Optional, saves to JSON file
    outputPath: 'analysis.json'      // Optional, custom output path
  }
);

console.log(`Found ${analysis.totalFiles} files in ${analysis.totalDirectories} directories`);
```

#### Using the GitHubAnalyzer Class

```typescript
import { GitHubAnalyzer } from './src/github-analyzer';

const analyzer = new GitHubAnalyzer(process.env.GITHUB_TOKEN);

// Analyze repository
const analysis = await analyzer.analyzeRepository(
  'https://github.com/owner/repo',
  'main' // branch (optional)
);

// Save to file
await analyzer.saveAnalysisToFile(analysis, './custom-output.json');
```

#### Processing Results

```typescript
// Find files by extension
function findFilesByExtension(structures: FileStructure[], extension: string) {
  const results: FileStructure[] = [];
  
  for (const item of structures) {
    if (item.type === 'file' && item.name.endsWith(extension)) {
      results.push(item);
    }
    if (item.children) {
      results.push(...findFilesByExtension(item.children, extension));
    }
  }
  
  return results;
}

const jsFiles = findFilesByExtension(analysis.fileStructure, '.js');
console.log(`Found ${jsFiles.length} JavaScript files`);
```

## Output Format

The analyzer produces a JSON structure with the following format:

```typescript
interface RepositoryAnalysis {
  repository: {
    owner: string;           // Repository owner
    name: string;            // Repository name
    fullName: string;        // owner/name
    url: string;             // GitHub URL
    defaultBranch: string;   // Default branch name
  };
  fileStructure: FileStructure[];  // Complete file tree
  totalFiles: number;               // Total file count
  totalDirectories: number;         // Total directory count
  analysisDate: string;            // ISO date string
}

interface FileStructure {
  name: string;              // File/directory name
  path: string;              // Full path from repository root
  type: 'file' | 'dir';      // Type indicator
  size?: number;             // File size in bytes
  content?: string;          // File content (for files)
  encoding?: string;         // File encoding
  children?: FileStructure[]; // Child items (for directories)
}
```

## Example Output

```json
{
  "repository": {
    "owner": "microsoft",
    "name": "TypeScript",
    "fullName": "microsoft/TypeScript",
    "url": "https://github.com/microsoft/TypeScript",
    "defaultBranch": "main"
  },
  "fileStructure": [
    {
      "name": "src",
      "path": "src",
      "type": "dir",
      "children": [
        {
          "name": "compiler",
          "path": "src/compiler",
          "type": "dir",
          "children": [
            {
              "name": "types.ts",
              "path": "src/compiler/types.ts",
              "type": "file",
              "size": 50234,
              "content": "// TypeScript source code...",
              "encoding": "utf-8"
            }
          ]
        }
      ]
    }
  ],
  "totalFiles": 847,
  "totalDirectories": 123,
  "analysisDate": "2025-01-27T10:30:00.000Z"
}
```

## Rate Limits

- **Without Token**: 60 requests per hour per IP
- **With Token**: 5,000 requests per hour per user

For large repositories, a GitHub token is highly recommended.

## Limitations

- Files larger than 1MB are not fetched (GitHub API limitation)
- Binary files are included but content may not be useful
- Very large repositories may take significant time to analyze
- Respects GitHub API rate limits

## Error Handling

The analyzer includes comprehensive error handling for:

- Invalid GitHub URLs
- Network connectivity issues
- Authentication problems
- Rate limit exceeded
- Repository access denied
- File access errors

## Examples

Run the included example:

```bash
npm run example-github
```

This demonstrates:
- Basic repository analysis
- Custom file filtering
- Processing file structures
- Saving results

## Integration

This analyzer can be easily integrated into larger applications:

```typescript
// In your application
import { GitHubAnalyzer, type RepositoryAnalysis } from './src/github-analyzer';

export async function processRepository(url: string): Promise<RepositoryAnalysis> {
  const analyzer = new GitHubAnalyzer(process.env.GITHUB_TOKEN);
  return await analyzer.analyzeRepository(url);
}
```

## Contributing

To extend the analyzer:

1. Add new methods to the `GitHubAnalyzer` class
2. Update the TypeScript interfaces for new data structures
3. Add corresponding CLI commands in `github-analyzer-cli.ts`
4. Update this README with new features

## License

This project follows the same license as the parent project.