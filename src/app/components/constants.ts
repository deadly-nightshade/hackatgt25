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
  baseUrl: "http://localhost:4111/api/workflows",
  workflows: {
    sequential: "sequentialPipeline",
    repositoryParser: "repositoryParserWorkflow"
  },
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