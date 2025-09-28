import axios from "axios";
import type { Repository, Chapter } from "./types";
import { API_CONFIG } from "./constants";

/* =========================
 * API utility functions
 * ======================= */
export class ApiService {
  static async createRun(runId: string): Promise<void> {
    await axios.post(`${API_CONFIG.baseUrl}/create-run?runId=${runId}`, {});
  }

  static async startRun(runId: string, repoUrl: string): Promise<void> {
    await axios.post(
      `${API_CONFIG.baseUrl}/start?runId=${runId}`,
      { inputData: { repoUrl }, runtimeContext: {} },
      { headers: { "Content-Type": "application/json" } }
    );
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
        await new Promise((r) => setTimeout(r, API_CONFIG.pollInterval));
        return poll();
      }
      return result;
    };
    return poll();
  }
}

/* =========================
 * Repository utility functions
 * ======================= */
export class RepositoryService {
  static createRepositoryFromUrl(url: string, _result?: any): Repository {
    const repoName = url.split("/").pop() || "Unknown Repository";

    const chapters: Chapter[] = [
      {
        id: "overview",
        title: "Overview",
        content: [
          "# Repository Overview",
          "",
          "Generated overview of the repository structure and contents.",
          "",
          "- Repository purpose and goals",
          "- Technology stack",
          "- Getting started guide",
        ].join("\n"),
        order: 0,
      },
      {
        id: "analysis",
        title: "Code Analysis",
        content: [
          "# Code Analysis",
          "",
          "Detailed analysis of the codebase structure and patterns.",
          "",
          "- Code quality metrics",
          "- Complexity analysis",
          "- Dependency relationships",
        ].join("\n"),
        order: 1,
      },
      {
        id: "architecture",
        title: "Architecture",
        content: [
          "# System Architecture",
          "",
          "System architecture and design decisions.",
          "",
          "- System components",
          "- Data flow diagrams",
          "- Integration patterns",
        ].join("\n"),
        order: 2,
      },
    ];

    return { id: Date.now().toString(), title: repoName, chapters };
  }

  static findRepositoryById(repositories: Repository[], id: string): Repository | undefined {
    return repositories.find((repo) => repo.id === id);
  }

  /** Replaces old findChapterByPath; chapters are identified by `id` */
  static findChapterById(repository: Repository, chapterId: string): Chapter | undefined {
    return repository.chapters.find((chapter) => chapter.id === chapterId);
  }

  /** Find chapter by a normalized path property (legacy support) */
  static findChapterByPath(repository: Repository, chapterPath: string): Chapter | undefined {
    return repository.chapters.find((chapter) => chapter.path === chapterPath || chapter.id === chapterPath);
  }

  /**
   * Derive display content from a chapter's markdown.
   * Keeps the original return shape your UI expects.
   */
  static getChapterContent(
    repositories: Repository[],
    repoId: string,
    chapterId: string
  ): { title: string; description: string; items: string[] } {
    const repository = this.findRepositoryById(repositories, repoId);
    if (!repository) {
      return { title: "Content", description: "Repository not found.", items: [] };
    }

    const chapter = this.findChapterById(repository, chapterId);
    if (!chapter) {
      return { title: "Content", description: "Chapter not found.", items: [] };
    }

  const content = chapter.content ?? "";
  const md = typeof content === "string" ? content : (content.rawMarkdown ?? "");

    // Title = first h1 or fall back to chapter.title
    const titleMatch = md.match(/^\s*#\s+(.+)\s*$/m);
    const title = (titleMatch?.[1] ?? chapter.title).trim();

    // Description = first non-empty, non-heading, non-list paragraph
  const lines = md.split("\n");
    let description = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^#{1,6}\s+/.test(trimmed)) continue; // heading
      if (/^(\*|-|\d+\.)\s+/.test(trimmed)) continue; // list item
      description = trimmed;
      break;
    }
    if (!description) description = "Content for this chapter is being generated...";

    // Items = simple list extraction (bullet or numbered)
    const items = lines
      .map((l) => l.trim())
      .filter((l) => /^(\*|-|\d+\.)\s+/.test(l))
      .map((l) => l.replace(/^(\*|-|\d+\.)\s+/, ""));

    return { title, description, items };
  }
}

/* =========================
 * UI utility functions
 * ======================= */
export class UIUtils {
  static formatOutput(output: string): { isJson: boolean; formatted: string } {
    try {
      const parsed = JSON.parse(output);
      return { isJson: true, formatted: JSON.stringify(parsed, null, 2) };
    } catch {
      return { isJson: false, formatted: output };
    }
  }

  static extractRepoName(url: string): string {
    return url.split("/").pop() || "Unknown Repository";
  }

  // Deprecated: kept for compatibility; prefer RepositoryService.getChapterContent
  static getChapterContent(_chapterId: string): {
    title: string;
    description: string;
    items: string[];
  } {
    return {
      title: "Content",
      description: "Please use RepositoryService.getChapterContent for repository-specific content.",
      items: [],
    };
  }
}

/* =========================
 * Error handling utilities
 * ======================= */
export class ErrorHandler {
  static handleApiError(error: unknown): string {
    if (error instanceof Error) return `Error: ${error.message}`;
    return "An unknown error occurred.";
  }
  static isNetworkError(error: unknown): boolean {
    return axios.isAxiosError(error) && !error.response;
  }
}

/* =========================
 * Mermaid utilities
 * ======================= */
export class MermaidUtils {
  private static generateValidDiagramId(suffix?: string): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8);
    const baseSuffix = suffix ? `-${suffix}` : "";
    return `diagram-${timestamp}-${randomPart}${baseSuffix}`;
  }

  static generateMermaidDiagram(
    abstractionsList: string[],
    relationships: Array<{ from: number; to: number; label: string }>
  ): string {
    if (!abstractionsList || abstractionsList.length === 0) {
      return "flowchart TD\n    A[No abstractions available]";
    }

    let mermaidCode = "flowchart TD\n";

    abstractionsList.forEach((abstraction, index) => {
      const nodeId = `A${index}`;
      const nodeLabel = abstraction.replace(/['"]/g, "").replace(/\n/g, " ").trim();
      mermaidCode += `    ${nodeId}["${nodeLabel}"]\n`;
    });

    if (relationships && relationships.length > 0) {
      mermaidCode += "\n";
      relationships.forEach((rel) => {
        const fromId = `A${rel.from}`;
        const toId = `A${rel.to}`;
        const label = rel.label.replace(/['"]/g, "").replace(/\n/g, " ").trim();
        mermaidCode += `    ${fromId} -->|"${label}"| ${toId}\n`;
      });
    }

    mermaidCode += "\n";
    mermaidCode += "    classDef default fill:#ececec,stroke:#491b72,stroke-width:2px,color:#491b72\n";
    mermaidCode += "    classDef nodeText color:#491b72\n";

    return mermaidCode;
  }

  static generateMermaidMarkdown(
    abstractionsList: string[],
    relationships: Array<{ from: number; to: number; label: string }>
  ): string {
    const mermaidCode = this.generateMermaidDiagram(abstractionsList, relationships);
    return `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
  }

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
