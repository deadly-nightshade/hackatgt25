"use client";

import React from "react";
import Diagram from "./components/Diagram";
import { DiagramData } from "./components/types";
import axios from "axios";

const datasets: DiagramData[] = [
  {
    title: "PocketFlow-Tutorial-Codebase-Knowledge",
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
      { name: "FetchRepo(Node)", nestedClass: "asdfj(Node)", nestedExplanation: "explanation for asdfj" } as import("./components/types").ClassData,
      { name: "IdentifyAbstractions(Node)", description: "Identifies abstractions." } as import("./components/types").ClassData,
      { name: "AnalyzeRelationships(Node)", nestedClass: "prep(self, shared)", nestedExplanation: "explanation for yippee" } as import("./components/types").ClassData,
    ],
    // 👇 new stuff
    constants: ["PI = 3.14", "MAX_USERS = 100"],
    notes: ["This file handles repo fetching", "Abstraction detection is experimental"],
  },
];


export default function App() {
  const [linkInput, setLinkInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!linkInput.trim()) {
      setOutput("Please enter a repository link");
      return;
    }

    setIsLoading(true);
    setOutput("Processing...");

    try {
      const runId = "test";
      const baseUrl = "http://localhost:4111/api/workflows/sequentialPipeline";

      // Step 1: Create a run
      await axios.post(`${baseUrl}/create-run?runId=${runId}`, {});
      setOutput("Run created successfully...");

      // Step 2: Start the run
      await axios.post(`${baseUrl}/start?runId=${runId}`, {
        inputData: {
          repoUrl: linkInput
        },
        runtimeContext: {}
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      setOutput("Run started successfully. Polling for results...");

      // Step 3: Poll execution result until status is no longer "running"
      const pollExecutionResult = async () => {
        const response = await axios.get(`${baseUrl}/runs/${runId}/execution-result`);
        
        if (response.data.status === "running") {
          setOutput("Run is still running...");
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          return pollExecutionResult();
        }
        return response.data;
      };

      const finalResult = await pollExecutionResult();
      setOutput(JSON.stringify(finalResult.result.abstractions, null, 2));
      
    } catch (error) {
      if (error instanceof Error) {
        setOutput(`Error: ${error.message}`);
      } else {
        setOutput("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderOutput = () => {
    if (!output) {
      return (
        <div className="text-gray-500 italic">
          Output will appear here...
        </div>
      );
    }

    // Try to parse as JSON for better formatting
    try {
      const parsed = JSON.parse(output);
      return (
        <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded-md overflow-x-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      // If not JSON, display as regular text with proper formatting
      return (
        <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md">
          {output}
        </div>
      );
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
        {/* Full-screen background gradient */}
  <div className="fixed inset-0 w-full h-full -z-10 bg-[linear-gradient(100deg,rgba(216,213,255,1)_9%,rgba(225,186,213,1)_100%)] border-[5px] border-white rounded-2xl"/>
  <div className="inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px]"></div>
      {/* Title Banner */}
      <div className=" left-0 right-0 top-0 bg-white py-5 flex justify-center items-center mb-4 shadow-[0_2px_8px_#00000010] z-10">
        <h2 className="text-xl font-bold text-[#491b72]">
          Dumb it Down
          {/*The-Pocket / {inputData.title}*/}
        </h2>
      </div>
      {/* Link Input Section */}
      <div className="mb-6 space-y-4">
        <div>
          <label htmlFor="link-input" className="block text-sm font-medium text-gray-700 mb-2">
            Enter Repository Link:
          </label>
          <div className="flex gap-2">
            <input
              id="link-input"
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Process"}
            </button>
          </div>
        </div>

        {/* Output Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Output:
          </label>
          <div className="w-full min-h-[100px] border border-gray-300 rounded-md shadow-sm">
            {renderOutput()}
          </div>
        </div>
      </div>

      {/* Diagram Section */}
      <div>
        {datasets.map((d, i) => (
          <Diagram key={i} inputData={d} />
        ))}
      </div>
    </div>
  );
}
