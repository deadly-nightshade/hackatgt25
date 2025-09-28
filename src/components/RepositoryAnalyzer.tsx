import React, { useState } from 'react';

export const RepositoryAnalyzer: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const analyzeRepository = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/parse-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze repository');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Repository Structure Generator</h1>
      
      <div className="mb-6">
        <label htmlFor="repoUrl" className="block text-sm font-medium mb-2">
          GitHub Repository URL
        </label>
        <div className="flex gap-2">
          <input
            id="repoUrl"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={analyzeRepository}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Structure'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Structure Generation Results</h2>
            <div className="text-sm text-gray-600 mb-4">
              <p>Total Files: {result.metadata?.totalFiles}</p>
              <p>Analyzed At: {new Date(result.metadata?.parsedAt).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Repository Structure (JSON)</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(result.parsedStructure, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Structure Summary</h3>
            <div className="bg-gray-50 p-4 rounded border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Repository:</strong> {result.parsedStructure?.repository?.name || 'Unknown'}
                </div>
                <div>
                  <strong>Main Language:</strong> {result.parsedStructure?.repository?.mainLanguage || 'Unknown'}
                </div>
                <div>
                  <strong>Total Files:</strong> {result.parsedStructure?.repository?.totalFiles || 0}
                </div>
                <div>
                  <strong>Total Folders:</strong> {result.parsedStructure?.repository?.totalFolders || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};