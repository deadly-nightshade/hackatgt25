import { Repository, DiagramData } from "./types";
import { MarkdownParserService } from "./MarkdownParserService";

// Special Process Repository entry
export const PROCESS_REPOSITORY_ID = "process-repo";

// Initialize markdown parser
const markdownParser = MarkdownParserService.getInstance();

// Function to load repositories from markdown
export async function loadRepositories(): Promise<Repository[]> {
  try {
    // Load repositories from test.md
    const markdownRepositories = await markdownParser.loadTestMarkdownFile();
    
    // Add the Process Repository at the beginning
    const processRepo: Repository = {
      id: PROCESS_REPOSITORY_ID,
      title: "Process Repository!",
      chapters: []
    };
    
    return [processRepo, ...markdownRepositories];
  } catch (error) {
    console.error('Error loading repositories from markdown:', error);
    // Fallback to process repo only
    return [{
      id: PROCESS_REPOSITORY_ID,
      title: "Process Repository!",
      chapters: []
    }];
  }
}

// For backward compatibility, export empty array initially
// This will be populated dynamically in the component
export const sampleRepositories: Repository[] = [];

// Sample diagram data
export const sampleDiagrams: DiagramData[] = [
  {
    title: "GitGood",
    file: "nodes.py",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    imports: ["os", "re", "yaml"],
    functions: [
      {
        name: "get_content_for_indices",
        signature: "get_content_for_indices(files_data, indices)",
        description: "Gets code snippets based on indices.",
      },
    ],
    classes: [
      { name: "FetchRepo(Node)", popupFunctionNames: ["prep(self, shared)", "run(self)"] , nestedExplanation: "explanation for asdfj" } as any,
      { name: "IdentifyAbstractions(Node)", popupFunctionNames: ["prep(self, shared)"] , description: "Identifies abstractions." } as any,
      { name: "AnalyzeRelationships(Node)", popupFunctionNames: ["exec(self, prep_res)", "analyze(self)"] , nestedClass: "prep(self, shared)", nestedExplanation: "explanation for yippee" } as any,
    ],
  },
  {
    title: "GitGood",
    file: "main.py",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    imports: ["os", "re", "yaml"],
    functions: [
      {
        name: "get_content_for_indices",
        signature: "get_content_for_indices(files_data, indices)",
        description: "Gets code snippets based on indices.",
      },
    ],
    classes: [
      { name: "aaasdfjsf(Node)", popupFunctionNames: ["prep(self, shared)", "run(self)"] , nestedExplanation: "explanation for asdfj" } as any,
      { name: "asdfasdf(Node)", popupFunctionNames: ["prep(self, shared)"] , description: "Identifies abstractions." } as any,
      { name: "lskdfjlkjsf(Node)", popupFunctionNames: ["exec(self, prep_res)", "analyze(self)"] , nestedClass: "prep(self, shared)", nestedExplanation: "explanation for yippee" } as any,
    ],
  }
];

// API Configuration
export const API_CONFIG = {
  baseUrl: "http://localhost:4111/api/workflows/sequentialPipeline",
  pollInterval: 2000,
  defaultRunId: "test"
};

// UI Constants
export const UI_CONSTANTS = {
  appTitle: "GitGood",
  version: "v1.0",
  maxRepositories: 10,
  sidebarWidth: {
    mobile: "w-80",
    desktop: "lg:w-64 xl:w-80"
  }
};