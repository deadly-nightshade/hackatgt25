"use client";

import React from "react";
import { Chapter, Repository, SidebarProps } from "./types";

interface CollapsibleSidebarProps extends SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ 
  repositories, 
  currentRepo, 
  currentChapter, 
  isOpen, 
  onToggle,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse
}: CollapsibleSidebarProps) {
  
  const handleRepoClick = (repoId: string) => {
    onNavigate(repoId);
  };

  const handleChapterClick = (repoId: string, chapterPath: string) => {
    onNavigate(repoId, chapterPath);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar with collapsible functionality */}
      <div className={`
        fixed top-0 left-0 h-full bg-[#ececec] shadow-[4px_4px_25px_#00000040] transform transition-all duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${isCollapsed ? 'lg:w-16 xl:w-16' : 'w-80 lg:w-64 xl:w-80'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-[3px] border-white bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)] flex-shrink-0">
          {!isCollapsed && (
            <h2 className="text-lg font-bold text-white">Navigation</h2>
          )}
          
          <div className="flex items-center gap-2">
            {/* Collapse/Expand button for desktop */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:block p-2 rounded-md hover:bg-white/20 transition-colors"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg 
                  className={`w-4 h-4 text-white transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            {/* Mobile close button */}
            <button
              onClick={onToggle}
              className="lg:hidden p-2 rounded-md hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
          {repositories.length === 0 ? (
            <div className={`text-[#491b72] text-sm italic font-mono ${isCollapsed ? 'text-center' : ''}`}>
              {isCollapsed ? "..." : "No repositories loaded yet"}
            </div>
          ) : (
            <div className="space-y-4">
              {repositories.map((repo) => (
                <div key={repo.id} className="space-y-2">
                  {/* Repository Title */}
                  <button
                    onClick={() => handleRepoClick(repo.id)}
                    className={`
                      w-full text-left rounded-xl text-sm font-bold transition-all duration-300 shadow-[2px_2px_15px_#00000020]
                      ${isCollapsed ? 'px-2 py-2 flex justify-center' : 'px-4 py-3'}
                      ${currentRepo === repo.id 
                        ? 'bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)] text-white shadow-[4px_4px_25px_#00000040] border-[2px] border-white' 
                        : 'text-[#491b72] hover:bg-white/50 hover:shadow-[3px_3px_20px_#00000030] bg-white/30'
                      }
                    `}
                    title={isCollapsed ? repo.title : undefined}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                      <svg className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                      </svg>
                      {!isCollapsed && <span className="truncate">{repo.title}</span>}
                    </div>
                  </button>

                  {/* Chapters - hidden when collapsed */}
                  {!isCollapsed && repo.chapters.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {repo.chapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterClick(repo.id, chapter.path)}
                          className={`
                            bg-none w-full text-left px-4 py-2 rounded-2xl text-sm transition-all duration-300 font-mono
                            ${currentRepo === repo.id && currentChapter === chapter.path
                              ? 'bg-white text-[#491b72] shadow-[3px_3px_20px_#00000030] border-[2px] border-purple-300 font-bold'
                              : 'text-[#491b72] hover:bg-white/40 hover:shadow-[2px_2px_15px_#00000020] bg-white/20'
                            }
                          `}
                        >
                          <div className="flex items-center">
                            <svg className="w-3 h-3 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate">{chapter.title}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-[3px] border-white p-4 bg-white/20 flex-shrink-0">
          <div className={`text-xs text-[#491b72] font-mono font-bold ${isCollapsed ? 'text-center' : ''}`}>
            {isCollapsed ? "v1.0" : <>Git Good v1.0<br />Made with blood, sweat & tears by Archit, Kai Wen, Ishan, Sienna</>}
          </div>
        </div>
      </div>
    </>
  );
}