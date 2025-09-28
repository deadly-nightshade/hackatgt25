export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  encoding?: string;
  children?: FileNode[];
}

export interface RepoStructure {
  owner: string;
  repo: string;
  branch: string;
  structure: FileNode[];
  aiAnalysis?: any; // Will contain the AI analysis results
  abstractionAnalysis?: any; // Will contain the abstraction analysis results
  relationshipAnalysis?: any; // Will contain the relationship analysis results
  chapterOrder?: any; // Will contain the chapter order results
  chapters?: any; // Will contain the generated chapters
}