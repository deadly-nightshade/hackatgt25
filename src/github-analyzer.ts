// src/github-analyzer.ts
import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";

/**
 * GitHub repository analyzer that fetches file structure and content
 * using GitHub API without AI/Mastra dependencies
 */

interface FileStructure {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  encoding?: string;
  children?: FileStructure[];
}

interface RepositoryAnalysis {
  repository: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
    defaultBranch: string;
  };
  fileStructure: FileStructure[];
  totalFiles: number;
  totalDirectories: number;
  analysisDate: string;
}

export class GitHubAnalyzer {
  private octokit: Octokit;
  private maxFileSize: number = 1024 * 1024; // 1MB limit for file content

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const urlPatterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
      /github\.com\/([^\/]+)\/([^\/]+)$/
    ];

    const cleanUrl = url.replace(/^https?:\/\//, '');
    
    for (const pattern of urlPatterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '')
        };
      }
    }

    throw new Error(`Invalid GitHub URL format: ${url}`);
  }

  /**
   * Fetch repository information
   */
  private async getRepositoryInfo(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        url: data.html_url,
        defaultBranch: data.default_branch,
      };
    } catch (error) {
      throw new Error(`Failed to fetch repository info: ${error}`);
    }
  }

  /**
   * Recursively fetch directory contents
   */
  private async fetchDirectoryContents(
    owner: string,
    repo: string,
    path: string = "",
    branch: string = "main"
  ): Promise<FileStructure[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      const contents = Array.isArray(data) ? data : [data];
      const structures: FileStructure[] = [];

      for (const item of contents) {
        const structure: FileStructure = {
          name: item.name,
          path: item.path,
          type: item.type === 'dir' ? 'dir' : 'file',
          size: item.size,
        };

        if (item.type === 'dir') {
          // Recursively fetch subdirectory contents
          structure.children = await this.fetchDirectoryContents(
            owner,
            repo,
            item.path,
            branch
          );
        } else if (item.type === 'file') {
          // Fetch file content if it's not too large
          if (item.size && item.size < this.maxFileSize) {
            try {
              const content = await this.fetchFileContent(owner, repo, item.path, branch);
              structure.content = content.content;
              structure.encoding = content.encoding;
            } catch (error) {
              console.warn(`Failed to fetch content for ${item.path}:`, error);
              structure.content = `[Error: Could not fetch file content - ${error}]`;
            }
          } else {
            structure.content = `[File too large: ${item.size} bytes]`;
          }
        }

        structures.push(structure);
      }

      return structures;
    } catch (error) {
      throw new Error(`Failed to fetch directory contents for ${path}: ${error}`);
    }
  }

  /**
   * Fetch individual file content
   */
  private async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string = "main"
  ): Promise<{ content: string; encoding: string }> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if ('content' in data && data.content) {
        return {
          content: data.encoding === 'base64' 
            ? Buffer.from(data.content, 'base64').toString('utf-8')
            : data.content,
          encoding: data.encoding || 'utf-8'
        };
      }

      throw new Error('File content not available');
    } catch (error) {
      throw new Error(`Failed to fetch file content: ${error}`);
    }
  }

  /**
   * Count files and directories in structure
   */
  private countStructureItems(structures: FileStructure[]): { files: number; directories: number } {
    let files = 0;
    let directories = 0;

    for (const item of structures) {
      if (item.type === 'file') {
        files++;
      } else if (item.type === 'dir') {
        directories++;
        if (item.children) {
          const childCounts = this.countStructureItems(item.children);
          files += childCounts.files;
          directories += childCounts.directories;
        }
      }
    }

    return { files, directories };
  }

  /**
   * Main method to analyze a GitHub repository
   */
  async analyzeRepository(url: string, branch?: string): Promise<RepositoryAnalysis> {
    console.log(`Starting analysis of repository: ${url}`);

    try {
      // Parse URL
      const { owner, repo } = this.parseGitHubUrl(url);
      console.log(`Parsed repository: ${owner}/${repo}`);

      // Get repository info
      const repoInfo = await this.getRepositoryInfo(owner, repo);
      const targetBranch = branch || repoInfo.defaultBranch;

      console.log(`Fetching file structure from branch: ${targetBranch}`);

      // Fetch file structure and content
      const fileStructure = await this.fetchDirectoryContents(owner, repo, "", targetBranch);

      // Count items
      const counts = this.countStructureItems(fileStructure);

      console.log(`Analysis complete: ${counts.files} files, ${counts.directories} directories`);

      return {
        repository: repoInfo,
        fileStructure,
        totalFiles: counts.files,
        totalDirectories: counts.directories,
        analysisDate: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Repository analysis failed: ${error}`);
    }
  }

  /**
   * Save analysis results to a JSON file
   */
  async saveAnalysisToFile(analysis: RepositoryAnalysis, outputPath?: string): Promise<string> {
    const fileName = outputPath || `${analysis.repository.owner}_${analysis.repository.name}_analysis.json`;
    const filePath = path.resolve(fileName);

    try {
      const jsonContent = JSON.stringify(analysis, null, 2);
      fs.writeFileSync(filePath, jsonContent, 'utf-8');
      console.log(`Analysis saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save analysis: ${error}`);
    }
  }
}

/**
 * Utility function for quick repository analysis
 */
export async function analyzeGitHubRepository(
  url: string,
  options: {
    token?: string;
    branch?: string;
    saveToFile?: boolean;
    outputPath?: string;
  } = {}
): Promise<RepositoryAnalysis> {
  const analyzer = new GitHubAnalyzer(options.token);
  const analysis = await analyzer.analyzeRepository(url, options.branch);

  if (options.saveToFile) {
    await analyzer.saveAnalysisToFile(analysis, options.outputPath);
  }

  return analysis;
}

// Export types for use in other files
export type { FileStructure, RepositoryAnalysis };