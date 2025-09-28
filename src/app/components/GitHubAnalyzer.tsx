// src/app/components/GitHubAnalyzer.tsx
'use client';

import React, { useState } from 'react';
import type { RepositoryAnalysis, FileStructure } from '../../github-analyzer';

interface AnalysisResponse {
  success: boolean;
  data?: RepositoryAnalysis;
  error?: string;
  message?: string;
}

export default function GitHubAnalyzer() {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeRepository = async () => {
    if (!url) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/github-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          branch: branch.trim() || undefined,
          token: token.trim() || undefined,
        }),
      });

      const result: AnalysisResponse = await response.json();

      if (result.success && result.data) {
        setAnalysis(result.data);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Network error occurred while analyzing repository');
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResults = () => {
    if (!analysis) return;

    const dataStr = JSON.stringify(analysis, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${analysis.repository.owner}_${analysis.repository.name}_analysis.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const renderFileStructure = (structures: FileStructure[], depth = 0): React.ReactElement => {
    const maxDepth = 3;
    const maxItems = depth === 0 ? 20 : 10;

    return (
      <div className="ml-4">
        {structures.slice(0, maxItems).map((item, index) => (
          <div key={`${item.path}-${index}`} className="py-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-500">
                {item.type === 'dir' ? '📁' : '📄'}
              </span>
              <span className="font-mono">{item.name}</span>
              {item.size && (
                <span className="text-gray-500 text-xs">
                  ({formatBytes(item.size)})
                </span>
              )}
            </div>
            {item.children && depth < maxDepth && (
              <div className="ml-4 border-l border-gray-200 pl-2">
                {renderFileStructure(item.children, depth + 1)}
              </div>
            )}
          </div>
        ))}
        {structures.length > maxItems && (
          <div className="text-gray-500 text-sm ml-6">
            ... and {structures.length - maxItems} more items
          </div>
        )}
      </div>
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">GitHub Repository Analyzer</h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Repository URL *
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
                Branch (optional)
              </label>
              <input
                type="text"
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main, master, develop..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Token (optional, for higher rate limits)
              </label>
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={analyzeRepository}
            disabled={isLoading || !url}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Analyzing Repository...' : 'Analyze Repository'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Analysis Results</h2>
              <p className="text-gray-600">
                Repository: <a 
                  href={analysis.repository.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono"
                >
                  {analysis.repository.fullName}
                </a>
              </p>
            </div>
            <button
              onClick={downloadResults}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Download JSON
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysis.totalFiles}</div>
              <div className="text-sm text-blue-800">Total Files</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysis.totalDirectories}</div>
              <div className="text-sm text-green-800">Total Directories</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analysis.repository.defaultBranch}</div>
              <div className="text-sm text-purple-800">Default Branch</div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">File Structure Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {renderFileStructure(analysis.fileStructure)}
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Analysis completed on {new Date(analysis.analysisDate).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}