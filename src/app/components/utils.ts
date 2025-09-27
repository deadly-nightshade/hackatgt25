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
        { id: '1', title: 'Overview', path: 'overview' },
        { id: '2', title: 'Code Analysis', path: 'analysis' },
        { id: '3', title: 'Architecture', path: 'architecture' }
      ]
    };
  }

  static findRepositoryById(repositories: Repository[], id: string): Repository | undefined {
    return repositories.find(repo => repo.id === id);
  }

  static findChapterByPath(repository: Repository, path: string) {
    return repository.chapters.find(chapter => chapter.path === path);
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

  static getChapterContent(chapterPath: string): {
    title: string;
    description: string;
    items: string[];
  } {
    const contentMap: Record<string, { title: string; description: string; items: string[] }> = {
      "chapter-1": {
        title: "Introduction",
        description: "This chapter covers the basic introduction to the codebase and its main components.",
        items: [
          "Project structure overview",
          "Main entry points",
          "Key dependencies"
        ]
      },
      "chapter-2": {
        title: "Core Functionality",
        description: "This chapter dives into the core functionality and business logic of the application.",
        items: [
          "Main algorithms and processes",
          "Data flow and transformations",
          "API endpoints and handlers"
        ]
      },
      "chapter-3": {
        title: "Advanced Topics",
        description: "This chapter covers advanced topics, patterns, and best practices used in the codebase.",
        items: [
          "Design patterns and architecture",
          "Performance optimizations",
          "Testing strategies",
          "Deployment and scaling"
        ]
      }
    };

    return contentMap[chapterPath] || {
      title: "Content",
      description: "Content for this chapter is being generated...",
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