import axios from "axios";
import { Repository } from "./types";
import { API_CONFIG } from "./constants";

// API utility functions
export class ApiService {
  static async createRun(runId: string): Promise<void> {
    await axios.post(`${API_CONFIG.baseUrl}/create-run?runId=${runId}`, {});
  }

  static async startRun(runId: string, repoUrl: string): Promise<void> {
    await axios.post(`${API_CONFIG.baseUrl}/start?runId=${runId}`, {
      inputData: { repoUrl },
      runtimeContext: {}
    }, {
      headers: { "Content-Type": "application/json" }
    });
  }

  static async getExecutionResult(runId: string): Promise<any> {
    const response = await axios.get(`${API_CONFIG.baseUrl}/runs/${runId}/execution-result`);
    return response.data;
  }

  static async pollExecutionResult(
    runId: string, 
    onUpdate?: (status: string) => void
  ): Promise<any> {
    const poll = async (): Promise<any> => {
      const result = await this.getExecutionResult(runId);
      
      if (result.status === "running") {
        onUpdate?.("Run is still running...");
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.pollInterval));
        return poll();
      }
      return result;
    };
    
    return poll();
  }
}

// Repository utility functions
export class RepositoryService {
  static createRepositoryFromUrl(url: string, result?: any): Repository {
    const repoName = url.split('/').pop() || 'Unknown Repository';
    return {
      id: Date.now().toString(),
      title: repoName,
      chapters: [
        { 
          id: '1', 
          title: 'Overview', 
          path: 'overview',
          content: {
            title: 'Repository Overview',
            description: 'Generated overview of the repository structure and contents.',
            items: [
              'Repository purpose and goals',
              'Technology stack',
              'Getting started guide'
            ]
          }
        },
        { 
          id: '2', 
          title: 'Code Analysis', 
          path: 'analysis',
          content: {
            title: 'Code Analysis',
            description: 'Detailed analysis of the codebase structure and patterns.',
            items: [
              'Code quality metrics',
              'Complexity analysis',
              'Dependency relationships'
            ]
          }
        },
        { 
          id: '3', 
          title: 'Architecture', 
          path: 'architecture',
          content: {
            title: 'System Architecture',
            description: 'System architecture and design decisions.',
            items: [
              'System components',
              'Data flow diagrams',
              'Integration patterns'
            ]
          }
        }
      ]
    };
  }

  static findRepositoryById(repositories: Repository[], id: string): Repository | undefined {
    return repositories.find(repo => repo.id === id);
  }

  static findChapterByPath(repository: Repository, path: string) {
    return repository.chapters.find(chapter => chapter.path === path);
  }

  static getChapterContent(repositories: Repository[], repoId: string, chapterPath: string): {
    title: string;
    description: string;
    items: string[];
  } {
    const repository = this.findRepositoryById(repositories, repoId);
    if (!repository) {
      return {
        title: "Content",
        description: "Repository not found.",
        items: []
      };
    }

    const chapter = this.findChapterByPath(repository, chapterPath);
    if (chapter?.content) {
      return chapter.content;
    }

    return {
      title: "Content",
      description: "Content for this chapter is being generated...",
      items: []
    };
  }
}

// UI utility functions
export class UIUtils {
  static formatOutput(output: string): { isJson: boolean; formatted: string } {
    try {
      const parsed = JSON.parse(output);
      return {
        isJson: true,
        formatted: JSON.stringify(parsed, null, 2)
      };
    } catch {
      return {
        isJson: false,
        formatted: output
      };
    }
  }

  static extractRepoName(url: string): string {
    return url.split('/').pop() || 'Unknown Repository';
  }

  // Deprecated: Use RepositoryService.getChapterContent instead
  static getChapterContent(chapterPath: string): {
    title: string;
    description: string;
    items: string[];
  } {
    return {
      title: "Content",
      description: "Please use RepositoryService.getChapterContent for repository-specific content.",
      items: []
    };
  }
}

// Error handling utilities
export class ErrorHandler {
  static handleApiError(error: unknown): string {
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "An unknown error occurred.";
  }

  static isNetworkError(error: unknown): boolean {
    return axios.isAxiosError(error) && !error.response;
  }
}

export class MermaidUtils {
  /**
   * Generates a valid CSS-safe ID for Mermaid diagrams
   * @param suffix - Optional suffix to make ID unique
   * @returns Valid CSS selector ID
   */
  private static generateValidDiagramId(suffix?: string): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8); // Remove 0. prefix and take 6 chars
    const baseSuffix = suffix ? `-${suffix}` : '';
    return `diagram-${timestamp}-${randomPart}${baseSuffix}`;
  }

  /**
   * Generates a Mermaid flowchart diagram from abstractionsList and relationships
   * @param abstractionsList - Array of abstraction names
   * @param relationships - Array of relationship objects with from, to, and label
   * @returns Mermaid diagram code as string
   */
  static generateMermaidDiagram(
    abstractionsList: string[],
    relationships: Array<{ from: number; to: number; label: string }>
  ): string {
    if (!abstractionsList || abstractionsList.length === 0) {
      return 'flowchart TD\n    A[No abstractions available]';
    }

    let mermaidCode = 'flowchart TD\n';
    
    // Create nodes for each abstraction
    abstractionsList.forEach((abstraction, index) => {
      // Clean the abstraction name for use as node ID and create a readable label
      const nodeId = `A${index}`;
      const nodeLabel = abstraction
        .replace(/['"]/g, '') // Remove quotes
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .trim();
      
      // Use rectangular nodes with the abstraction names
      mermaidCode += `    ${nodeId}["${nodeLabel}"]\n`;
    });

    // Add relationships if they exist
    if (relationships && relationships.length > 0) {
      mermaidCode += '\n';
      relationships.forEach((rel) => {
        const fromId = `A${rel.from}`;
        const toId = `A${rel.to}`;
        const label = rel.label
          .replace(/['"]/g, '') // Remove quotes
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .trim();
        
        // Create arrow with label
        mermaidCode += `    ${fromId} -->|"${label}"| ${toId}\n`;
      });
    }

    // Add styling for better appearance
    mermaidCode += '\n';
    mermaidCode += '    classDef default fill:#ececec,stroke:#491b72,stroke-width:2px,color:#491b72\n';
    mermaidCode += '    classDef nodeText color:#491b72\n';

    return mermaidCode;
  }

  /**
   * Creates a markdown code block with Mermaid diagram
   * @param abstractionsList - Array of abstraction names
   * @param relationships - Array of relationship objects
   * @returns Markdown string with Mermaid code block
   */
  static generateMermaidMarkdown(
    abstractionsList: string[],
    relationships: Array<{ from: number; to: number; label: string }>
  ): string {
    const mermaidCode = this.generateMermaidDiagram(abstractionsList, relationships);
    return `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
  }

  /**
   * Creates a Mermaid placeholder div with properly encoded data and valid ID
   * @param abstractionsList - Array of abstraction names
   * @param relationships - Array of relationship objects
   * @returns HTML string with mermaid placeholder
   */
  static generateMermaidPlaceholder(
    abstractionsList: string[],
    relationships: Array<{ from: number; to: number; label: string }>
  ): string {
    const mermaidCode = this.generateMermaidDiagram(abstractionsList, relationships);
    const diagramId = this.generateValidDiagramId();
    const encodedCode = encodeURIComponent(mermaidCode);
    
    return `<div class="mermaid-placeholder" data-mermaid-code="${encodedCode}" data-mermaid-id="${diagramId}"></div>`;
  }
}