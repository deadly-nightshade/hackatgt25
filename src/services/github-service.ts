export interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  content?: string;
  size: number;
  sha: string;
}

export interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  files: GitHubFile[];
}

export interface FolderStructure {
  type: 'folder';
  path: string;
  files: FileInfo[];
  folders: { [key: string]: FolderStructure };
}

export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  language: string;
  sizeBytes: number;
}

export interface RepositoryStructure {
  repository: {
    name: string;
    description: string;
    mainLanguage: string;
    totalFiles: number;
    totalFolders: number;
    structure: { [key: string]: FolderStructure };
  };
}

export class GitHubService {
  private githubToken: string;
  
  constructor(token?: string) {
    this.githubToken = token || process.env.GITHUB_TOKEN || '';
  }

  async parseRepository(repoUrl: string): Promise<GitHubRepo> {
    const { owner, repo } = this.parseGitHubUrl(repoUrl);
    
    // Get repository info
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': this.githubToken ? `token ${this.githubToken}` : '',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository info: ${repoResponse.statusText}`);
    }

    const repoInfo = await repoResponse.json();

    // Get file tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch || 'main'}?recursive=1`,
      {
        headers: {
          'Authorization': this.githubToken ? `token ${this.githubToken}` : '',
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!treeResponse.ok) {
      throw new Error(`Failed to fetch repository tree: ${treeResponse.statusText}`);
    }

    const tree = await treeResponse.json();

    // Filter and process files
    const files: GitHubFile[] = [];
    
    for (const item of tree.tree) {
      if (item.type === 'blob' && this.shouldIncludeFile(item.path || '')) {
        try {
          const fileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`,
            {
              headers: {
                'Authorization': this.githubToken ? `token ${this.githubToken}` : '',
                'Accept': 'application/vnd.github.v3+json',
              },
            }
          );

          if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            
            if (fileData.content) {
              const content = Buffer.from(fileData.content, 'base64').toString();
              
              files.push({
                path: item.path || '',
                name: item.path?.split('/').pop() || '',
                type: 'file',
                content: content,
                size: item.size || 0,
                sha: item.sha || '',
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch content for ${item.path}:`, error);
        }
      }
    }

    return {
      name: repoInfo.name,
      description: repoInfo.description || '',
      language: repoInfo.language || 'unknown',
      files,
    };
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }
    return {
      owner: match[1],
      repo: match[2].replace('.git', ''),
    };
  }

  private shouldIncludeFile(path: string): boolean {
    const ignorePaths = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.DS_Store',
      '__pycache__',
      '.pytest_cache',
      'venv',
      '.env',
      '.next',
      'out',
      'target',
      'bin',
      'obj',
    ];

    const includeExtensions = [
      '.js', '.ts', '.tsx', '.jsx',
      '.py', '.java', '.cpp', '.c',
      '.cs', '.php', '.rb', '.go',
      '.rs', '.swift', '.kt', '.scala',
      '.md', '.json', '.yml', '.yaml',
      '.html', '.css', '.scss', '.less',
      '.vue', '.svelte', '.dart', '.sh',
    ];

    // Skip ignored paths
    if (ignorePaths.some(ignore => path.includes(ignore))) {
      return false;
    }

    // Skip files that are too large (we'll check this later)
    // Include files with supported extensions
    return includeExtensions.some(ext => path.endsWith(ext));
  }

  getLanguageFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'dart': 'dart',
      'vue': 'vue',
      'svelte': 'svelte',
    };
    
    return langMap[ext || ''] || ext || 'text';
  }

  buildFolderStructure(repoData: GitHubRepo): RepositoryStructure {
    const structure: { [key: string]: FolderStructure } = {};
    let totalFolders = 0;

    // Process each file and build the folder structure
    for (const file of repoData.files) {
      const pathParts = file.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const folderPath = pathParts.slice(0, -1);

      // Build nested folder structure
      let currentLevel = structure;
      let currentPath = '';

      for (let i = 0; i < folderPath.length; i++) {
        const folderName = folderPath[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        if (!currentLevel[folderName]) {
          currentLevel[folderName] = {
            type: 'folder',
            path: currentPath,
            files: [],
            folders: {},
          };
          totalFolders++;
        }

        // Move to the next level
        if (i < folderPath.length - 1) {
          currentLevel = currentLevel[folderName].folders;
        }
      }

      // Add the file to the appropriate folder
      const fileInfo: FileInfo = {
        name: fileName,
        path: file.path,
        extension: this.getFileExtension(fileName),
        language: this.getLanguageFromPath(file.path),
        sizeBytes: file.size,
      };

      if (folderPath.length > 0) {
        const targetFolder = this.getFolderByPath(structure, folderPath);
        if (targetFolder) {
          targetFolder.files.push(fileInfo);
        }
      } else {
        // Root level file
        if (!structure['root']) {
          structure['root'] = {
            type: 'folder',
            path: '',
            files: [],
            folders: {},
          };
          totalFolders++;
        }
        structure['root'].files.push(fileInfo);
      }
    }

    return {
      repository: {
        name: repoData.name,
        description: repoData.description,
        mainLanguage: repoData.language,
        totalFiles: repoData.files.length,
        totalFolders,
        structure,
      },
    };
  }

  private getFolderByPath(structure: { [key: string]: FolderStructure }, pathParts: string[]): FolderStructure | null {
    let currentLevel = structure;
    
    for (let i = 0; i < pathParts.length; i++) {
      const folderName = pathParts[i];
      if (!currentLevel[folderName]) {
        return null;
      }
      if (i === pathParts.length - 1) {
        return currentLevel[folderName];
      }
      currentLevel = currentLevel[folderName].folders;
    }
    
    return null;
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot + 1);
  }
}