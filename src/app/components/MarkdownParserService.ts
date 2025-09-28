import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';

export interface Chapter {
  id: string;
  title: string;
  path: string;
  content: {
    title: string;
    description: string;
    htmlContent: string;
    rawMarkdown: string;
  };
}

export interface ParsedRepository {
  id: string;
  title: string;
  chapters: Chapter[];
}

export class MarkdownParserService {
  private static instance: MarkdownParserService;
  
  constructor() {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }

  static getInstance(): MarkdownParserService {
    if (!MarkdownParserService.instance) {
      MarkdownParserService.instance = new MarkdownParserService();
    }
    return MarkdownParserService.instance;
  }

  async parseMarkdownFile(markdownContent: string, repositoryId: string, repositoryTitle: string): Promise<ParsedRepository> {
    // Split content by chapter headers (# Chapter)
    const chapters = this.splitIntoChapters(markdownContent);
    
    const parsedChapters: Chapter[] = [];
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterId = `ch${i + 1}`;
      const chapterPath = this.createPathFromTitle(chapter.title);
      
      // Parse markdown to HTML
      const htmlContent = await this.parseMarkdownToHTML(chapter.content);
      
      // Extract description (first paragraph)
      const description = this.extractDescription(chapter.content);
      
      parsedChapters.push({
        id: chapterId,
        title: chapter.title,
        path: chapterPath,
        content: {
          title: chapter.title,
          description,
          htmlContent,
          rawMarkdown: chapter.content
        }
      });
    }

    return {
      id: repositoryId,
      title: repositoryTitle,
      chapters: parsedChapters
    };
  }

  private async parseMarkdownToHTML(markdown: string): Promise<string> {
    // First, extract and process Mermaid diagrams
    const processedMarkdown = await this.processMermaidDiagrams(markdown);
    
    // Add proper spacing before headers and improve formatting
    const formattedMarkdown = this.improveMarkdownFormatting(processedMarkdown);
    
    // Parse markdown to HTML - marked() returns a Promise in newer versions
    const rawHTML = await marked(formattedMarkdown);
    
    // Sanitize HTML for security
    const cleanHTML = DOMPurify.sanitize(rawHTML);
    
    return cleanHTML;
  }

  private improveMarkdownFormatting(markdown: string): string {
    const lines = markdown.split('\n');
    const improvedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      
      // Process custom \text\ syntax to inline code
      const processedLine = this.processCustomCodeSyntax(currentLine);
      
      // Add processed line
      improvedLines.push(processedLine);
      
      // Check if we need to add spacing before the next header
      if (nextLine && this.isHeader(nextLine) && !this.isEmpty(currentLine) && !this.isHeader(currentLine)) {
        // Add extra spacing before headers when previous line has content
        improvedLines.push(''); // Add blank line
        improvedLines.push(''); // Add another for more spacing
      }
    }
    
    return improvedLines.join('\n');
  }

  private processCustomCodeSyntax(line: string): string {
    // Convert \text\ to `text` (inline code syntax)
    // Use a regex to find all instances of \text\ and replace them
    return line.replace(/\\([^\\]+)\\/g, '`$1`');
  }

  private isHeader(line: string): boolean {
    return line.trim().match(/^#{1,6}\s+/);
  }

  private isEmpty(line: string): boolean {
    return line.trim() === '';
  }

  private async processMermaidDiagrams(markdown: string): Promise<string> {
    // Find mermaid code blocks and replace them with placeholder divs
    // The actual rendering will happen client-side after the HTML is inserted into the DOM
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    let processedMarkdown = markdown;
    const matches = [...markdown.matchAll(mermaidRegex)];
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const mermaidCode = match[1];
      const diagramId = `mermaid-${Date.now()}-${i}`;
      
      // Create a placeholder div that will be processed client-side
      const mermaidDiv = `<div class="mermaid-placeholder" data-mermaid-id="${diagramId}" data-mermaid-code="${encodeURIComponent(mermaidCode)}"></div>`;
      processedMarkdown = processedMarkdown.replace(match[0], mermaidDiv);
    }
    
    return processedMarkdown;
  }

  private extractDescription(markdown: string): string {
    // Find the first paragraph after the title
    const lines = markdown.split('\n');
    let foundTitle = false;
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        foundTitle = true;
        continue;
      }
      
      if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('```')) {
        // Return first substantial paragraph, limited to 200 characters
        return line.trim().substring(0, 200) + (line.length > 200 ? '...' : '');
      }
    }
    
    return 'Content for this chapter...';
  }

  private createPathFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  // Method to load and parse the test.md file with proper chapter splitting
  async loadTestMarkdownFile(): Promise<ParsedRepository[]> {
    try {
      const markdownContent = await this.fetchMarkdownContent();
      
      if (!markdownContent) {
        return [];
      }
      
      // Parse the markdown content into separate chapters
      const repository = await this.parseMarkdownFile(
        markdownContent,
        'puzzle-maker-tutorial',
        'PuzzleMaker Tutorial'
      );
      
      return [repository];
    } catch (error) {
      console.error('Error loading test.md:', error);
      return [];
    }
  }

  private async fetchMarkdownContent(): Promise<string> {
    // In Next.js, we need to create an API route to access the file system
    // For now, let's return a placeholder that we'll replace with actual API call
    try {
      const response = await fetch('/api/markdown/test');
      if (!response.ok) throw new Error('Failed to fetch markdown');
      return await response.text();
    } catch (error) {
      console.error('Error fetching markdown content:', error);
      // Fallback to empty content
      return '';
    }
  }

  private splitIntoChapters(markdown: string): Array<{ title: string; content: string }> {
    // Split by # headers (chapter markers)
    const lines = markdown.split('\n');
    const chapters: Array<{ title: string; content: string }> = [];
    let currentChapter: { title: string; content: string } | null = null;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // Save previous chapter if exists
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter - but don't include the header line in content
        currentChapter = {
          title: line.replace('# ', '').trim(),
          content: '' // Start with empty content, don't include the header
        };
      } else if (currentChapter) {
        // Add line to current chapter
        currentChapter.content += line + '\n';
      }
    }

    // Add the last chapter
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    return chapters;
  }

  // Method to load and parse the final.json file
  async loadFinalJsonFile(): Promise<ParsedRepository[]> {
    try {
      const jsonData = await this.fetchFinalJsonContent();
      
      if (!jsonData) {
        return [];
      }
      
      // Parse the JSON data into chapters
      const repository = await this.parseJsonToRepository(jsonData);
      
      return [repository];
    } catch (error) {
      console.error('Error loading final.json:', error);
      return [];
    }
  }

  private async fetchFinalJsonContent(): Promise<any> {
    try {
      const response = await fetch('/api/json/final');
      if (!response.ok) throw new Error('Failed to fetch final.json');
      return await response.json();
    } catch (error) {
      console.error('Error fetching final.json content:', error);
      return null;
    }
  }

  // private async parseJsonToRepository(jsonData: any): Promise<ParsedRepository> {
  //   const { repoUrl, abstractionsList, chapters } = jsonData;
    
  //   // Use repoUrl as the repository title
  //   const repositoryTitle = repoUrl || 'Repository Tutorial';
  //   const parsedChapters: Chapter[] = [];
    
  //   // Create chapters from the abstractionsList and chapters array
  //   for (let i = 0; i < abstractionsList.length && i < chapters.length; i++) {
  //     const chapterTitle = abstractionsList[i];
  //     const chapterMarkdown = chapters[i];
  //     const chapterId = `ch${i + 1}`;
  //     const chapterPath = this.createPathFromTitle(chapterTitle);
      
  //     // Parse markdown to HTML
  //     const htmlContent = await this.parseMarkdownToHTML(chapterMarkdown);
      
  //     // Extract description (first paragraph)
  //     const description = this.extractDescription(chapterMarkdown);
      
  //     parsedChapters.push({
  //       id: chapterId,
  //       title: chapterTitle,
  //       path: chapterPath,
  //       content: {
  //         title: chapterTitle,
  //         description,
  //         htmlContent,
  //         rawMarkdown: chapterMarkdown
  //       }
  //     });
  //   }

  //   return {
  //     id: 'final-json-tutorial',
  //     title: repositoryTitle,
  //     chapters: parsedChapters
  //   };
  // }

  // Enhanced parseJsonToRepository to handle filename-based IDs
  private async parseJsonToRepository(jsonData: any, fileName?: string): Promise<ParsedRepository> {
    const { repoUrl, abstractionsList, chapters } = jsonData;
    
    // Use filename or repoUrl as the repository title and ID
    const repositoryId = fileName ? `repo-${fileName}` : 'final-json-tutorial';
    const repositoryTitle = repoUrl || fileName || 'Repository Tutorial';
    const parsedChapters: Chapter[] = [];
    
    // Create chapters from the abstractionsList and chapters array
    for (let i = 0; i < abstractionsList.length && i < chapters.length; i++) {
      const chapterTitle = abstractionsList[i];
      const chapterMarkdown = chapters[i];
      const chapterId = `ch${i + 1}`;
      const chapterPath = this.createPathFromTitle(chapterTitle);
      
      // Parse markdown to HTML
      const htmlContent = await this.parseMarkdownToHTML(chapterMarkdown);
      
      // Extract description (first paragraph)
      const description = this.extractDescription(chapterMarkdown);
      
      parsedChapters.push({
        id: chapterId,
        title: chapterTitle,
        path: chapterPath,
        content: {
          title: chapterTitle,
          description,
          htmlContent,
          rawMarkdown: chapterMarkdown
        }
      });
    }

    return {
      id: repositoryId,
      title: repositoryTitle,
      chapters: parsedChapters
    };
  }
}