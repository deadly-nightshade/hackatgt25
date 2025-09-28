"use client";

import React from "react";
import Diagram from "./components/Diagram";
import Sidebar from "./components/Sidebar";
import { Repository, CurrentView } from "./components/types";
import { sampleRepositories, sampleDiagrams, UI_CONSTANTS, API_CONFIG, PROCESS_REPOSITORY_ID } from "./components/constants";
import { ApiService, RepositoryService, UIUtils, ErrorHandler } from "./components/utils";

export default function App() {
  const [linkInput, setLinkInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Repository[]>(sampleRepositories);
  const [currentRepo, setCurrentRepo] = React.useState<string>("");
  const [currentView, setCurrentView] = React.useState<CurrentView | null>(null);

  const handleSubmit = async () => {
    if (!linkInput.trim()) {
      setOutput("Please enter a repository link");
      return;
    }

    setIsLoading(true);
    setOutput("Processing...");

    try {
      const runId = API_CONFIG.defaultRunId + "_" + Date.now(); // Unique run ID

      // Step 1: Create a run for repository parser workflow
      await ApiService.createRun(runId, 'repositoryParser');
      setOutput("Run created successfully...");

      // Step 2: Start the run with repository URL
      await ApiService.startRun(runId, { repoUrl: linkInput.trim() }, 'repositoryParser');
      setOutput("Run started successfully. Polling for results...");

      // Step 3: Poll execution result
      const finalResult = await ApiService.pollExecutionResult(runId, setOutput, 'repositoryParser');
      
      // Display the message from our workflow - it should be in finalResult.message
      if (finalResult && finalResult.message) {
        setOutput(finalResult.message);
      } else {
        setOutput(JSON.stringify(finalResult, null, 2));
      }
      
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {repo.chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => handleNavigation(repo.id, chapter.path)}
                className="bg-[#ececec] p-6 rounded-3xl shadow-[4px_4px_25px_#00000040] hover:shadow-[6px_6px_30px_#00000060] cursor-pointer transition-all duration-300 border-[3px] border-white"
              >
                <h3 className="font-bold text-[#491b72] text-lg mb-2">{chapter.title}</h3>
                <p className="text-sm text-[#491b72] font-mono">Click to view this chapter</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Show specific chapter
    const chapter = RepositoryService.findChapterByPath(repo, currentView.chapter);
    if (!chapter) return <div className="text-[#491b72] font-mono">Chapter not found</div>;

    const chapterContent = UIUtils.getChapterContent(chapter.path);

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
        
        <div className="bg-[#ececec] rounded-2xl shadow-[2px_2px_15px_#00000040] p-6 border-[3px] border-white">
          <h2 className="text-xl font-bold mb-4 text-[#491b72]">Content for {chapter.title}</h2>
          <p className="text-[#491b72] mb-4 font-mono">
            This is the content for {chapter.title} in the {repo.title} repository.
          </p>
          
          {/* Dynamic chapter content */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#491b72]">{chapterContent.title}</h3>
            <p className="text-[#491b72] font-mono">
              {chapterContent.description}
            </p>
            {chapterContent.items.length > 0 && (
              <ul className="list-disc list-inside text-[#491b72] space-y-2 font-mono">
                {chapterContent.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
