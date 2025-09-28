# hackatgt25 — AI Code Analysis & Tutorial Generation

A Next.js application that uses Mastra workflows to analyze GitHub repositories and generate educational content with AI agents.

## Project Structure

- `src/mastra/workflows/test-workflow.ts` — Main analysis pipeline
- `src/mastra/agents/` — AI agents for specific tasks (analyze code, identify abstractions, etc.)
- `src/mastra/tools/` — Helper functions for agents
- `src/app/api/` — Next.js API routes
- `data/` — Sample JSON outputs

## How It Works: The test-workflow.ts Pipeline

The main workflow (`test-workflow.ts`) is a 6-step sequential pipeline that transforms a GitHub URL into educational tutorial content:

### Step 1: fetchRepoStep
- **Agent Used**: `repoAnalyst`
- **Purpose**: Fetches and analyzes repository structure
- **Input**: GitHub repository URL
- **Output**: Repository analysis text + mock file data
- **Implementation**: Currently uses mock data but structured for real GitHub API integration

### Step 2: identifyAbstractionsStep  
- **Agent Used**: `IdentifyAbstractionAgent`
- **Purpose**: Identifies key architectural concepts and patterns
- **Input**: Repository analysis from step 1
- **Output**: JSON array of abstractions with names, descriptions, and file references
- **Fallback**: If AI parsing fails, extracts capitalized words as abstraction names

### Step 3: analyzeRelationshipsStep
- **Agent Used**: `analyseRelationsAgent` 
- **Tool Used**: `analyze-relationships-tool.ts`
- **Purpose**: Maps how abstractions interact with each other
- **Input**: Abstractions + file contents
- **Output**: Project summary + relationship graph (from/to indices with labels)

### Step 4: orderChaptersStep
- **Agent Used**: `OrderChaptersAgent`
- **Tool Used**: `order-chapters-tool.ts` 
- **Purpose**: Determines optimal learning sequence for tutorials
- **Input**: Abstractions + relationships
- **Output**: Array of abstraction indices in pedagogical order

### Step 5: writeChaptersStep
- **Agent Used**: `WriteChapterAgent`
- **Tool Used**: `write-chapters-tool.ts`
- **Purpose**: Generates beginner-friendly Markdown tutorials
- **Input**: Ordered abstractions + relationships + file contents
- **Output**: Array of Markdown chapter content with Mermaid diagrams

### Step 6: final-output-step
- **Purpose**: Consolidates all outputs for API response
- **Output**: Complete analysis with abstractions, relationships, chapter order, and generated content

## Key Agents

- **`repoAnalyst`** — Analyzes repository structure and purpose
- **`IdentifyAbstractionAgent`** — Extracts architectural patterns from code
- **`analyseRelationsAgent`** — Maps interactions between abstractions  
- **`OrderChaptersAgent`** — Sequences concepts for optimal learning
- **`WriteChapterAgent`** — Creates educational Markdown content

## API Endpoints

- `POST /api/github-analyze` — Triggers the full test-workflow pipeline
- `POST /api/code-analysis` — Code structure analysis
- `GET /api/data/[fileName]` — Sample JSON files
## Development

```bash
npm install
npm run dev  # Start Next.js dev server
```

The workflow runs through Mastra's runtime system, with compiled artifacts in `.mastra/output/` and state stored in `.mastra/mastra.db`.

## Generated Output

The pipeline produces:
- **Abstractions**: Key architectural concepts with descriptions
- **Relationships**: How abstractions interact (with Mermaid diagrams)
- **Chapter Order**: Optimal learning sequence  
- **Tutorial Chapters**: Beginner-friendly Markdown with code examples and diagrams

Results are saved as JSON files in `data/` and can be visualized through the Next.js UI.
