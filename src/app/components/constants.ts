import { Repository, DiagramData } from "./types";

// Special Process Repository entry
export const PROCESS_REPOSITORY_ID = "process-repo";

// Sample sidebar data
export const sampleRepositories: Repository[] = [
  {
    id: PROCESS_REPOSITORY_ID,
    title: "Process Repository!",
    chapters: []
  },
  {
    id: "repo1",
    title: "PocketFlow-Tutorial",
    chapters: [
      { id: "ch1", title: "Chapter 1", path: "chapter-1" },
      { id: "ch2", title: "Chapter 2", path: "chapter-2" },
      { id: "ch3", title: "Chapter 3", path: "chapter-3" }
    ]
  },
  {
    id: "repo2", 
    title: "Codebase-Knowledge",
    chapters: [
      { id: "ch1", title: "Chapter 1", path: "chapter-1" },
      { id: "ch2", title: "Chapter 2", path: "chapter-2" },
      { id: "ch3", title: "Chapter 3", path: "chapter-3" }
    ]
  }
];

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
      { name: "FetchRepo(Node)", popupFunctionName: "prep(self, shared)", nestedExplanation: "explanation for asdfj" } as any,
      { name: "IdentifyAbstractions(Node)", popupFunctionName: "prep(self, shared)", description: "Identifies abstractions." } as any,
      { name: "AnalyzeRelationships(Node)", popupFunctionName: "exec(self, prep_res)", nestedClass: "prep(self, shared)", nestedExplanation: "explanation for yippee" } as any,
    ],
    constants: ["PI = 3.14", "MAX_USERS = 100"],
    notes: ["This file handles repo fetching", "Abstraction detection is experimental"],
  },
];

// API Configuration
export const API_CONFIG = {
  baseUrl: "http://localhost:4111/api/workflows/sequentialPipeline",
  pollInterval: 2000,
  defaultRunId: "test"
};

// UI Constants
export const UI_CONSTANTS = {
  appTitle: "Git Good",
  version: "v1.0",
  maxRepositories: 10,
  sidebarWidth: {
    mobile: "w-80",
    desktop: "lg:w-64 xl:w-80"
  }
};