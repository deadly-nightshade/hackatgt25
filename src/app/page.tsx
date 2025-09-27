import React from "react";
import Diagram from "./components/Diagram";
import { DiagramData } from "./components/types";

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
  return (
    <div>
      {datasets.map((d, i) => (
        <Diagram key={i} inputData={d} />
      ))}
    </div>
  );
}
