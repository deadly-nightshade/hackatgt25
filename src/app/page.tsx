"use client";

import React from "react";
import Diagram from "./components/Diagram";
import Sidebar from "./components/Sidebar";
import { Repository, CurrentView } from "./components/types";
import { sampleDiagrams, UI_CONSTANTS, API_CONFIG, PROCESS_REPOSITORY_ID } from "./components/constants";
import { ApiService, RepositoryService, UIUtils, ErrorHandler, MermaidUtils } from "./components/utils";
import { useMermaidRenderer } from "./components/useMermaidRenderer";
import { MarkdownParserService } from "./components/MarkdownParserService";

export default function App() {
  const [linkInput, setLinkInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [currentRepo, setCurrentRepo] = React.useState<string>("");
  const [currentView, setCurrentView] = React.useState<CurrentView | null>(null);

  // Track loaded JSON files and their data
  const [jsonFiles, setJsonFiles] = React.useState<string[]>([]);
  const [loadedData, setLoadedData] = React.useState<Map<string, any>>(new Map());
  const [change, setChange] = React.useState(0); // State to trigger re-fetching file list

  // State for parsed relationship summary - moved to top level to fix hooks order
  const [parsedSummary, setParsedSummary] = React.useState<string>('');

  // Initialize Mermaid renderer
  useMermaidRenderer();

  // Parse the relationship summary markdown when repository changes - moved to top level
  React.useEffect(() => {
    const parseRelationshipSummary = async () => {
      if (currentView && repositories.length > 0) {
        const repo = RepositoryService.findRepositoryById(repositories, currentView.repo);
        if (repo?.metadata?.relationshipSummary) {
          const parser = MarkdownParserService.getInstance();
          const htmlContent = await parser.parseMarkdownToHTML(repo.metadata.relationshipSummary);
          setParsedSummary(htmlContent);
        } else {
          setParsedSummary('');
        }
      }
    };
    
    parseRelationshipSummary();
  }, [currentView, repositories]); // Dependencies: currentView and repositories

  // Load available JSON files from backend API
  React.useEffect(() => {
    const loadAvailableFiles = async () => {
      try {
        console.log('Fetching files from backend...');
        const response = await fetch('/api/files');
        if (response.ok) {
          const { files } = await response.json();
          console.log('Files received from backend:', files);
          setJsonFiles(files);
        } else {
          console.error('Failed to load file list from backend', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading file list:', error);
      }
    };

    loadAvailableFiles();
  }, [change]);

  // Load repositories whenever jsonFiles changes or when we need to load data
  React.useEffect(() => {
    const loadRepositoriesAsync = async () => {
      console.log('Loading repositories for files:', jsonFiles);
      const repositories: Repository[] = [];
      const newLoadedData = new Map(loadedData);
      
      // Load each JSON file
      for (const fileName of jsonFiles) {
        try {
          let data = loadedData.get(fileName);
          
          // If data isn't loaded yet, fetch it from the backend
          if (!data) {
            console.log(`Fetching data for ${fileName}...`);
            const response = await fetch(`/api/data/${fileName}`);
            if (response.ok) {
              data = await response.json();
              console.log(`Data loaded for ${fileName}:`, data);
              newLoadedData.set(fileName, data);
            } else {
              console.warn(`Failed to load ${fileName} from backend`, response.status);
              continue;
            }
          }
          
          // Create repository from JSON data - pass data directly
          const fileNameWithoutExtension = fileName.replace('.json', '');
          const repository = await parseJsonToRepository(data, fileNameWithoutExtension);
          console.log(`Repository created for ${fileName}:`, repository);
          repositories.push(repository);
        } catch (error) {
          console.warn(`Could not load ${fileName}:`, error);
        }
      }
      
      // Update loaded data state
      setLoadedData(newLoadedData);
      
      // Create the Process Repository
      const processRepo: Repository = {
        id: PROCESS_REPOSITORY_ID,
        title: "Process Repository!",
        chapters: []
      };
      
      // Combine Process Repository at the beginning with loaded repositories
      const allRepos = [processRepo, ...repositories];
      console.log('Final repositories array:', allRepos);
      setRepositories(allRepos);
    };

    if (jsonFiles.length > 0) {
      loadRepositoriesAsync();
    } else {
      console.log('No JSON files to load, jsonFiles array is empty:', jsonFiles);
    }
  }, [jsonFiles]); // Only depend on jsonFiles, not loadedData to avoid infinite loops

  // Function to refresh the file list from backend (useful for adding new files)
  const refreshFileList = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const { files } = await response.json();
        setJsonFiles(files);
      }
    } catch (error) {
      console.error('Error refreshing file list:', error);
    }
  };

  // Function to save a new JSON file to the backend
  const saveJsonFile = async (fileName: string, content: any) => {
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          content: JSON.stringify(content, null, 2)
        })
      });
      
      if (response.ok) {
        // Refresh the file list to include the new file
        setChange(change + 1); // Trigger re-fetching file list
        await refreshFileList();
      } else {
        console.error('Failed to save file to backend');
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  // Helper function to parse JSON data into Repository format - now with proper markdown parsing
  const parseJsonToRepository = async (jsonData: any, fileName: string): Promise<Repository> => {
    const {status, result, payload, steps} = jsonData;
    const {repoUrl} = payload || {};
    const { abstractionsList, chapters, relationshipSummary, relationships} = result;
    
    // Create a more unique repository ID to avoid duplicates
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '-');
    const repositoryId = `repo-${sanitizedFileName}-${timestamp}`;
    
    const repositoryTitle = repoUrl.split("github.com/")[1] || fileName || 'Repository Tutorial';
    const parsedChapters: any[] = [];
    
    // Get the markdown parser instance
    const parser = MarkdownParserService.getInstance();
    
    // Create chapters from the abstractionsList and chapters array
    if (abstractionsList && chapters) {
      for (let i = 0; i < abstractionsList.length && i < chapters.length; i++) {
        const chapterTitle = abstractionsList[i];
        const chapterMarkdown = chapters[i];
        const chapterId = `ch${i + 1}`;
        const chapterPath = chapterTitle
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        // Parse markdown to HTML using the MarkdownParserService
        const htmlContent = await parser.parseMarkdownToHTML(chapterMarkdown);
        
        // Extract description from the first paragraph (explicitly type the callback)
        const firstLine = chapterMarkdown
          .split('\n')
          .find((line: string) => line.trim() && !line.startsWith('#') && !line.startsWith('```'));

        const description = firstLine
          ? firstLine.trim().substring(0, 200) + '...'
          : 'Chapter content...';
        
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
    }

    return {
      id: repositoryId,
      title: repositoryTitle,
      chapters: parsedChapters,
      metadata: {
        repoUrl: repoUrl || '',
        relationshipSummary: relationshipSummary || '',
        abstractionsList: abstractionsList || [],
        relationships: relationships || []
      }
    };
  };

  const handleSubmit = async () => {
    if (!linkInput.trim()) {
      setOutput("Please enter a repository link");
      return;
    }
    // Check if the repository name already exists
    const existingRepo = repositories.find(repo => repo.title === linkInput.trim().split("github.com/")[1]);
    if (existingRepo) {
      setOutput("A repository with this name already exists, you can find it in the sidebar!");
      return;
    }

    setIsLoading(true);
    setOutput("Processing...");

    try {
      const runId = API_CONFIG.defaultRunId;

      // Step 1: Create a run
      await ApiService.createRun(runId);
      setOutput("Run created successfully...");

      // Step 2: Start the run
      await ApiService.startRun(runId, linkInput);
      setOutput("Run started successfully. Polling for results...");

      // Step 3: Poll execution result
      const finalResult = await ApiService.pollExecutionResult(runId, setOutput);
      setOutput(JSON.stringify(finalResult, null, 2));
      // Save the output as a JSON file
      const fileName = `output-${Date.now()}.json`;

      try {
        const fileContent = new Blob([JSON.stringify(finalResult, null, 2)], { type: "application/json" });
        const fileUrl = URL.createObjectURL(fileContent);

        await saveJsonFile(fileName, finalResult);

        // Add the new file to the jsonFiles state
        setJsonFiles(prev => [...prev, fileName]);
      } catch (error) {
        console.error("Failed to save output as JSON file:", error);
      }
      
      // Create repository from result
      const newRepo = RepositoryService.createRepositoryFromUrl(linkInput, finalResult);
      setRepositories(prev => [...prev, newRepo]);
      setCurrentRepo(newRepo.id);
      
    } catch (error) {
      setOutput(ErrorHandler.handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = (repoId: string, chapterPath?: string) => {
    setCurrentRepo(repoId);
    if (chapterPath) {
      setCurrentView({ repo: repoId, chapter: chapterPath });
    } else {
      setCurrentView({ repo: repoId, chapter: "" });
    }
    setSidebarOpen(false);
  };

  const renderOutput = () => {
    if (!output) {
      return (
        <div className="text-[#491b72] italic font-mono">
          Output will appear here...
        </div>
      );
    }

    const { isJson, formatted } = UIUtils.formatOutput(output);
    
    return isJson ? (
      <pre className="whitespace-pre-wrap text-sm font-mono bg-[#ececec] p-4 rounded-3xl overflow-x-auto text-[#491b72] shadow-[4px_4px_25px_#00000040]">
        {formatted}
      </pre>
    ) : (
      <div className="whitespace-pre-wrap text-sm bg-[#ececec] p-4 rounded-3xl text-[#491b72] font-mono shadow-[4px_4px_25px_#00000040]">
        {formatted}
      </div>
    );
  };

  const renderCurrentView = () => {
    if (!currentView) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-[#491b72] mb-4">
            Welcome to {UI_CONSTANTS.appTitle}
          </h2>
          <p className="text-[#491b72] font-mono">
            Select a repository and chapter from the sidebar to get started.
          </p>
        </div>
      );
    }

    // Check if this is the Process Repository page
    if (currentView.repo === PROCESS_REPOSITORY_ID) {
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-[#491b72]">Process Repository!</h1>
          <p className="text-[#491b72] font-mono">
            Enter a repository URL below to analyze and generate documentation chapters.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="link-input" className="block text-sm font-bold text-[#491b72] mb-2 font-mono">
                Enter Repository Link:
              </label>
              <div className="flex gap-2">
                <input
                  id="link-input"
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="flex-1 px-4 py-3 border-[3px] border-white rounded-3xl shadow-[2px_2px_15px_#00000020] focus:outline-none focus:shadow-[4px_4px_25px_#00000040] transition-shadow font-mono text-[#491b72] bg-[#ececec]"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-6 py-3 bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)] text-white rounded-3xl hover:shadow-[6px_6px_30px_#00000060] focus:outline-none focus:shadow-[6px_6px_30px_#00000060] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-[4px_4px_25px_#00000040]"
                >
                  {isLoading ? "Processing..." : "Process"}
                </button>
              </div>
            </div>

            {/* Output Section */}
            {output && (
              <div>
                <label className="block text-sm font-bold text-[#491b72] mb-2 font-mono">
                  Processing Output:
                </label>
                <div className="w-full min-h-[100px] border-[3px] border-white rounded-3xl shadow-[2px_2px_15px_#00000020]">
                  {renderOutput()}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    const repo = RepositoryService.findRepositoryById(repositories, currentView.repo);
    if (!repo) return <div className="text-[#491b72] font-mono">Repository not found</div>;

    if (!currentView.chapter) {
      // Show repository overview
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-[#491b72]">{repo.title}</h1>
          <p className="text-[#491b72] font-mono">Repository Overview</p>
          {/* Display relationship summary if available */}
          {repo.metadata?.relationshipSummary && (
            <div className="bg-white/60 p-6 rounded-3xl shadow-[2px_2px_15px_#00000020] border-[2px] border-white/40">
              <h2 className="text-xl font-bold text-[#491b72] mb-3">Project Summary</h2>
              <div 
                className="text-[#491b72] font-mono leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: parsedSummary }}
                style={{
                  '--tw-prose-body': '#491b72',
                  '--tw-prose-headings': '#491b72',
                  '--tw-prose-links': '#7f66b3',
                  '--tw-prose-bold': '#491b72',
                  '--tw-prose-italic': '#6b46c1',
                } as React.CSSProperties}
              />
            </div>
          )}

          {/* Display Mermaid relationship diagram if data is available */}
          {repo.metadata?.abstractionsList && repo.metadata?.relationships && (
            <div className="bg-white/60 p-6 rounded-3xl shadow-[2px_2px_15px_#00000020] border-[2px] border-white/40">
              <h2 className="text-xl font-bold text-[#491b72] mb-3">Project Architecture</h2>
              <div 
                className="mermaid-container"
                dangerouslySetInnerHTML={{ 
                  __html: MermaidUtils.generateMermaidPlaceholder(
                    repo.metadata.abstractionsList, 
                    repo.metadata.relationships
                  )
                }}
              />
            </div>
          )}
          
          <p className="text-[#491b72] font-mono">Table of Contents</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {repo.chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => handleNavigation(repo.id, chapter.path)}
                className="bg-[#ececec] p-6 rounded-3xl shadow-[4px_4px_25px_#00000040] hover:shadow-[6px_6px_30px_#00000060] cursor-pointer transition-all duration-300 border-[3px] border-white"
              >
                <h3 className="font-bold text-[#491b72] text-lg mb-2">{chapter.title}</h3>
                {(() => {
                  const summary = RepositoryService.getChapterContent(repositories, repo.id, chapter.id);
                  return (
                    <p className="text-xs text-[#491b72] font-mono mt-2 opacity-70">
                      {summary.description.substring(0, 50)}...
                    </p>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      );
    }

  // Show specific chapter
  const chapter = RepositoryService.findChapterByPath(repo, currentView.chapter);
    if (!chapter) return <div className="text-[#491b72] font-mono">Chapter not found</div>;

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-sm text-[#491b72] font-mono">
          <button 
            onClick={() => handleNavigation(repo.id)}
            className="hover:text-purple-800 transition-colors"
          >
            {repo.title}
          </button>
          <span>/</span>
          <span className="font-bold">{chapter.title}</span>
        </div>
        
        <h1 className="text-3xl font-bold text-[#491b72]">{chapter.title}</h1>
        
        {/* Render HTML content from markdown */}
        {(() => {
          // Normalize content: if content is a string, attempt to parse via RepositoryService
          const normalized = typeof chapter.content === 'string'
            ? RepositoryService.getChapterContent(repositories, repo.id, chapter.id)
            : (chapter.content as any);

          if (normalized && (normalized as any).htmlContent) {
            return (
              <div 
                className="prose prose-lg max-w-none text-[#491b72] font-mono"
                dangerouslySetInnerHTML={{ __html: (normalized as any).htmlContent }}
                style={{
              // Custom styles for the rendered markdown
              '--tw-prose-body': '#491b72',
              '--tw-prose-headings': '#491b72',
              '--tw-prose-links': '#7f66b3',
              '--tw-prose-code': '#491b72',
              '--tw-prose-pre-bg': '#ececec',
            } as React.CSSProperties}
          />
          );
          }

          const summary = RepositoryService.getChapterContent(repositories, repo.id, chapter.id);
          return (
            <div className="bg-[#ececec] rounded-2xl shadow-[2px_2px_15px_#00000040] p-6 border-[3px] border-white">
              <h2 className="text-xl font-bold mb-4 text-[#491b72]">Content for {chapter.title}</h2>
              <p className="text-[#491b72] mb-4 font-mono">
                {summary.description || 'Loading chapter content...'}
              </p>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="relative h-screen">
      {/* Gradient background at lowest z-index */}
      <div className="fixed inset-0 -z-20 h-full w-full bg-[linear-gradient(100deg,rgba(216,213,255,1)_9%,rgba(225,186,213,1)_100%)]"></div>
      {/* White dots overlay above gradient, below all content */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-[radial-gradient(white_2px,transparent_2px)] [background-size:32px_32px]"></div>
      {/* Main app content above overlays */}
      <div className="flex h-screen relative z-0">
      
      {/* Sidebar */}
      <Sidebar
        repositories={repositories}
        currentRepo={currentRepo}
        currentChapter={currentView?.chapter}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNavigate={handleNavigation}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header with hamburger menu */}
        <div className="bg-[white] px-4 py-3 flex items-center justify-between lg:justify-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-xl font-bold text-[#4A1C72]">
            {UI_CONSTANTS.appTitle}
          </h1>
          
          <div className="w-10 lg:hidden"></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Main content in white container */}
            <div className="bg-[#ececec] rounded-2xl shadow-[4px_4px_25px_#00000040] border-[3px] border-white p-6 mt-5">
              {renderCurrentView()}
            </div>

            {/* Diagram outside the white container - directly on purple background */}
            {currentView && currentView.repo !== PROCESS_REPOSITORY_ID && sampleDiagrams.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-[#491b72] bg-[#ececec] rounded-2xl shadow-[4px_4px_25px_#00000040] border-[3px] border-white p-6 mt-5">Code Diagram</h2>
                {sampleDiagrams.map((d, i) => (
                  <Diagram key={i} inputData={d} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
