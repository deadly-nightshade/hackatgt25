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
export interface Chapter {
  id: string;
  title: string;
  path: string;
}

export interface Repository {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface SidebarProps {
  repositories: Repository[];
  currentRepo?: string;
  currentChapter?: string;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (repoId: string, chapterPath?: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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

