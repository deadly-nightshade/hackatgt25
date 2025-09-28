import { Repository, Chapter } from "./types";

export interface RepositoryJsonData {
  repoUrl: string;
  abstractions: string;
  abstractionsList: string[];
  relationshipSummary: string;
  relationships: Array<{
    from: number;
    to: number;
    label: string;
  }>;
  chapterOrder: number[];
  chapters: string[];
}

export class JsonProcessorService {
  private static instance: JsonProcessorService;

  static getInstance(): JsonProcessorService {
    if (!JsonProcessorService.instance) {
      JsonProcessorService.instance = new JsonProcessorService();
    }
    return JsonProcessorService.instance;
  }

  /**
   * Process a JSON file and convert it to Repository format
   */
  async processJsonFile(filePath: string): Promise<Repository> {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch JSON file: ${response.statusText}`);
      }
      
      const jsonData: RepositoryJsonData = await response.json();
      return this.convertJsonToRepository(jsonData);
    } catch (error) {
      console.error('Error processing JSON file:', error);
      throw new Error(`Failed to process JSON file: ${filePath}`);
    }
  }

  /**
   * Convert raw JSON data to Repository format
   */
  convertJsonToRepository(jsonData: RepositoryJsonData): Repository {
    const repoName = this.extractRepoName(jsonData.repoUrl);
    
    // Parse abstractions from JSON string
    let abstractionsData;
    try {
      abstractionsData = JSON.parse(jsonData.abstractions);
    } catch (error) {
      console.error('Error parsing abstractions JSON:', error);
      abstractionsData = { abstractions: [] };
    }

    // Convert chapters using the chapter order
    const chapters: Chapter[] = jsonData.chapterOrder.map((chapterIndex, index) => {
      const chapterContent = jsonData.chapters[chapterIndex];
      const abstractionIndex = chapterIndex;
      const abstraction = abstractionsData.abstractions[abstractionIndex];
      
      return {
        id: `chapter-${index + 1}`,
        title: abstraction ? abstraction.name : `Chapter ${index + 1}`,
        content: chapterContent,
        order: index + 1
      };
    });

    return {
      id: this.generateRepositoryId(jsonData.repoUrl),
      title: repoName,
      chapters: chapters,
      metadata: {
        repoUrl: jsonData.repoUrl,
        relationshipSummary: jsonData.relationshipSummary,
        abstractionsList: jsonData.abstractionsList,
        relationships: jsonData.relationships
      }
    };
  }

  /**
   * Process multiple JSON files from a directory
   */
  async processMultipleJsonFiles(filePaths: string[]): Promise<Repository[]> {
    const repositories: Repository[] = [];
    
    for (const filePath of filePaths) {
      try {
        const repository = await this.processJsonFile(filePath);
        repositories.push(repository);
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error);
        // Continue processing other files even if one fails
      }
    }
    
    return repositories;
  }

  /**
   * Process JSON data from a file input or URL
   */
  async processJsonFromInput(input: string | File): Promise<Repository> {
    let jsonData: RepositoryJsonData;

    if (typeof input === 'string') {
      // Input is a URL or file path
      if (input.startsWith('http') || input.startsWith('/')) {
        return this.processJsonFile(input);
      } else {
        // Input is raw JSON string
        try {
          jsonData = JSON.parse(input);
        } catch (error) {
          throw new Error('Invalid JSON string provided');
        }
      }
    } else {
      // Input is a File object
      const text = await this.readFileAsText(input);
      try {
        jsonData = JSON.parse(text);
      } catch (error) {
        throw new Error('Invalid JSON file provided');
      }
    }

    return this.convertJsonToRepository(jsonData);
  }

  /**
   * Validate JSON structure matches expected format
   */
  validateJsonStructure(jsonData: any): boolean {
    const requiredFields = [
      'repoUrl',
      'abstractions',
      'abstractionsList',
      'relationshipSummary',
      'relationships',
      'chapterOrder',
      'chapters'
    ];

    return requiredFields.every(field => field in jsonData);
  }

  /**
   * Extract repository name from URL
   */
  private extractRepoName(repoUrl: string): string {
    try {
      const urlParts = repoUrl.split('/');
      return urlParts[urlParts.length - 1] || 'Unknown Repository';
    } catch (error) {
      return 'Unknown Repository';
    }
  }

  /**
   * Generate a unique repository ID from URL
   */
  private generateRepositoryId(repoUrl: string): string {
    const repoName = this.extractRepoName(repoUrl);
    return `repo-${repoName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  /**
   * Read File object as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
