'use client';

import React, { useState, useRef } from 'react';
import { JsonProcessorService } from './JsonProcessorService';
import { Repository } from './types';

interface JsonFileLoaderProps {
  onRepositoryLoaded: (repository: Repository) => void;
  onError: (error: string) => void;
}

export default function JsonFileLoader({ onRepositoryLoaded, onError }: JsonFileLoaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonProcessor = JsonProcessorService.getInstance();

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const repository = await jsonProcessor.processJsonFromInput(file);
      onRepositoryLoaded(repository);
    } catch (error) {
      onError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processUrl = async (url: string) => {
    setIsProcessing(true);
    try {
      const repository = await jsonProcessor.processJsonFile(url);
      onRepositoryLoaded(repository);
    } catch (error) {
      onError(`Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processJsonString = async (jsonString: string) => {
    setIsProcessing(true);
    try {
      const repository = await jsonProcessor.processJsonFromInput(jsonString);
      onRepositoryLoaded(repository);
    } catch (error) {
      onError(`Failed to process JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPresetFile = async (fileName: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/data/${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error(`Failed to fetch preset: ${res.status}`);
      const json = await res.json();
      // If API returns an object or a JSON string, normalize to string input for processor
      const input = typeof json === 'string' ? json : JSON.stringify(json);
      const repository = await jsonProcessor.processJsonFromInput(input);
      onRepositoryLoaded(repository);
    } catch (error) {
      onError(`Failed to load preset file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/json') {
      processFile(file);
    } else {
      onError('Please select a valid JSON file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      processFile(file);
    } else {
      onError('Please drop a valid JSON file');
    }
  };

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    if (url) {
      processUrl(url);
    }
  };

  const handleJsonSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const jsonString = formData.get('jsonString') as string;
    if (jsonString) {
      processJsonString(jsonString);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800">Load Repository Documentation</h2>
      
      {/* Preset Files */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">Quick Load</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadPresetFile('final.json')}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Load Fifteen Puzzle Demo
          </button>
          {/* Add more preset buttons as needed */}
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">Upload JSON File</h3>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="space-y-2">
            <p className="text-gray-600">
              Drag and drop a JSON file here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600 underline"
                disabled={isProcessing}
              >
                browse files
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Supports repository documentation JSON files
            </p>
          </div>
        </div>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">Load from URL</h3>
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            name="url"
            type="url"
            placeholder="https://example.com/data.json"
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Load URL
          </button>
        </form>
      </div>

      {/* JSON String Input */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-700">Paste JSON</h3>
        <form onSubmit={handleJsonSubmit} className="space-y-2">
          <textarea
            name="jsonString"
            placeholder="Paste your JSON data here..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Process JSON
          </button>
        </form>
      </div>

      {/* Loading State */}
      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Processing file...</span>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 rounded p-4">
        <h4 className="font-semibold mb-2">Expected JSON Format:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Must contain: repoUrl, abstractions, abstractionsList, relationshipSummary, relationships, chapterOrder, chapters</li>
          <li>Abstractions should be a JSON string containing abstraction definitions</li>
          <li>Chapters should be an array of markdown strings</li>
          <li>ChapterOrder defines the sequence of chapters to display</li>
        </ul>
      </div>
    </div>
  );
}