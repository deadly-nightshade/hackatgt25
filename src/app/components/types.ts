export interface MethodData {
  name: string;
  description?: string;
}

export interface ClassData {
  name: string;
  description?: string;
  methods?: MethodData[];
  nestedClass?: string;
  nestedExplanation?: string;
}

export interface FunctionData {
  name: string;
  signature: string;
  description?: string;
}

export interface DiagramData {
  title: string;
  file: string;
  summary: string;
  imports: string[];
  functions: {
    name: string;
    signature: string;
    description?: string;
  }[];
  classes: {
    name: string;
    description?: string;
  }[];
  constants?: string[];
  [key: string]: any; // 👈 allows any other keys
}

// Sidebar and Navigation interfaces
export interface ChapterContent {
  title?: string;
  description?: string;
  items?: string[];
  htmlContent?: string;
  rawMarkdown?: string;
}

export interface Chapter {
  id: string;
  title: string;
  // Older code stored markdown directly as a string. Newer code uses a richer
  // content object. Allow either for backward compatibility.
  content?: string | ChapterContent;
  // Optional normalized path used for routing/navigation in the UI
  path?: string;
  order?: number;
}

export interface Repository {
  id: string;
  title: string;
  chapters: Chapter[];
  metadata?: {
    repoUrl: string;
    relationshipSummary: string;
    abstractionsList: string[];
    relationships: Array<{
      from: number;
      to: number;
      label: string;
    }>;
  };
}

// Legacy Chapter interface for backward compatibility
export interface LegacyChapter {
  id: string;
  title: string;
  path: string;
  content?: {
    title: string;
    description: string;
    items?: string[];
    htmlContent?: string;
    rawMarkdown?: string;
  };
}

// Application state interfaces
export interface CurrentView {
  repo: string;
  chapter: string;
}

export interface AppState {
  linkInput: string;
  output: string;
  isLoading: boolean;
  sidebarOpen: boolean;
  repositories: Repository[];
  currentRepo: string;
  currentView: CurrentView | null;
}

// Props used by the sidebar UI

// src/app/components/types.ts
export interface SidebarProps {
  repositories: Repository[];
  currentRepo?: string;
  currentChapter?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onNavigate?: (repoId: string, chapterId?: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}




