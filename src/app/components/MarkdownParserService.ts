// src/app/components/MarkdownParserService.ts
import { marked } from "marked";
import DOMPurify from "dompurify";
import mermaid from "mermaid";
import type { Chapter, Repository } from "./types"; // ✅ use shared types

export class MarkdownParserService {
  private static instance: MarkdownParserService;

  constructor() {
    marked.setOptions({ breaks: true, gfm: true });
    mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
  }

  static getInstance(): MarkdownParserService {
    if (!MarkdownParserService.instance) {
      MarkdownParserService.instance = new MarkdownParserService();
    }
    return MarkdownParserService.instance;
  }

  /** Parse one markdown string into a Repository with Chapter[] (shared types) */
  async parseMarkdownFile(
    markdownContent: string,
    repositoryId: string,
    repositoryTitle: string
  ): Promise<Repository> {
    const rawChapters = this.splitIntoChapters(markdownContent);

    // If you also need sanitized HTML later, you can compute it here,
    // but the shared Chapter type stores markdown in `content`.
    const chapters: Chapter[] = [];
    for (let i = 0; i < rawChapters.length; i++) {
      const ch = rawChapters[i];

      // Optional: pre-process mermaid / sanitize HTML (not stored in the shared type)
      // const html = await this.parseMarkdownToHTML(ch.content);

      chapters.push({
        id: `ch${i + 1}`,
        title: ch.title,
        content: ch.content, // store markdown per your shared type
        order: i,            // ✅ ensure required `order`
      });
    }

    return { id: repositoryId, title: repositoryTitle, chapters };
  }

  /** Convert markdown -> sanitized HTML (kept for future UI use) */
  public async parseMarkdownToHTML(markdown: string): Promise<string> {
    const processed = await this.processMermaidDiagrams(markdown);
    const formatted = this.improveMarkdownFormatting(processed);
    const rawHTML = await marked(formatted);
    const cleanHTML = DOMPurify.sanitize(rawHTML);
    return cleanHTML;
  }

  private improveMarkdownFormatting(markdown: string): string {
    const lines = markdown.split("\n");
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const current = lines[i];
      const next = lines[i + 1];

      const processed = this.processCustomCodeSyntax(current);
      out.push(processed);

      if (next && this.isHeader(next) && !this.isEmpty(current) && !this.isHeader(current)) {
        out.push("");
        out.push("");
      }
    }
    return out.join("\n");
  }

  private processCustomCodeSyntax(line: string): string {
    // turns \text\ into `text`
    return line.replace(/\\([^\\]+)\\/g, "`$1`");
  }

  private isHeader(line: string): boolean {
    return /^#{1,6}\s+/.test(line.trim());
  }
  private isEmpty(line: string): boolean {
    return line.trim() === "";
  }

  private async processMermaidDiagrams(markdown: string): Promise<string> {
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    let processed = markdown;
    const matches = [...markdown.matchAll(mermaidRegex)];

    for (let i = 0; i < matches.length; i++) {
      const code = matches[i][1];
      const id = `mermaid-${Date.now()}-${i}`;
      const div = `<div class="mermaid-placeholder" data-mermaid-id="${id}" data-mermaid-code="${encodeURIComponent(
        code
      )}"></div>`;
      processed = processed.replace(matches[i][0], div);
    }
    return processed;
  }

  private extractDescription(markdown: string): string {
    const lines = markdown.split("\n");
    let sawTitle = false;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        sawTitle = true;
        continue;
      }
      if (sawTitle && line.trim() && !line.startsWith("#") && !line.startsWith("```")) {
        return line.trim().substring(0, 200) + (line.length > 200 ? "..." : "");
      }
    }
    return "Content for this chapter...";
  }

  private createPathFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /** Load & parse /api/markdown/test into a Repository[] */
  async loadTestMarkdownFile(): Promise<Repository[]> {
    try {
      const content = await this.fetchMarkdownContent();
      if (!content) return [];
      const repo = await this.parseMarkdownFile(content, "puzzle-maker-tutorial", "PuzzleMaker Tutorial");
      return [repo];
    } catch (e) {
      console.error("Error loading test.md:", e);
      return [];
    }
  }

  private async fetchMarkdownContent(): Promise<string> {
    try {
      const res = await fetch("/api/markdown/test");
      if (!res.ok) throw new Error("Failed to fetch markdown");
      return await res.text();
    } catch (e) {
      console.error("Error fetching markdown content:", e);
      return "";
    }
  }

  private splitIntoChapters(markdown: string): Array<{ title: string; content: string }> {
    const lines = markdown.split("\n");
    const chapters: Array<{ title: string; content: string }> = [];
    let current: { title: string; content: string } | null = null;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (current) chapters.push(current);
        current = { title: line.replace("# ", "").trim(), content: "" };
      } else if (current) {
        current.content += line + "\n";
      }
    }
    if (current) chapters.push(current);
    return chapters;
  }

  /** Load & parse /api/json/final (optionally namespaced by fileName) into a Repository[] */
  async loadFinalJsonFile(fileName?: string): Promise<Repository[]> {
    try {
      const json = await this.fetchFinalJsonContent();
      if (!json) return [];
      const repo = await this.parseJsonToRepository(json, fileName);
      return [repo];
    } catch (e) {
      console.error("Error loading final.json:", e);
      return [];
    }
  }

  private async fetchFinalJsonContent(): Promise<any> {
    try {
      const res = await fetch("/api/json/final");
      if (!res.ok) throw new Error("Failed to fetch final.json");
      return await res.json();
    } catch (e) {
      console.error("Error fetching final.json content:", e);
      return null;
    }
  }

  /** Convert your JSON shape to the shared Repository/Chapter types */
  private async parseJsonToRepository(jsonData: any, fileName?: string): Promise<Repository> {
    const { repoUrl, abstractionsList = [], chapters = [] } = jsonData;

    const repositoryId = fileName ? `repo-${fileName}` : "final-json-tutorial";
    const repositoryTitle = repoUrl || fileName || "Repository Tutorial";

    const outChapters: Chapter[] = [];
    for (let i = 0; i < Math.min(abstractionsList.length, chapters.length); i++) {
      const chapterTitle = abstractionsList[i];
      const chapterMarkdown = chapters[i];

      // Optional HTML:
      // const html = await this.parseMarkdownToHTML(chapterMarkdown);
      // const description = this.extractDescription(chapterMarkdown);

      outChapters.push({
        id: `ch${i + 1}`,
        title: chapterTitle,
        content: chapterMarkdown, // markdown string
        order: i,
      });
    }

    return { id: repositoryId, title: repositoryTitle, chapters: outChapters };
  }
}
