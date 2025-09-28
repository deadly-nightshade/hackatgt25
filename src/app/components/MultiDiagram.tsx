"use client";
import React, { useState } from "react";
import { DiagramData } from "./types";
import Xarrow from "react-xarrows";
import Card from "./Card";

interface DiagramProps {
  inputData: DiagramData[];
}

function MultiDiagram({ inputData }: DiagramProps) {
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);

  const toggle = (name: string) =>
    setOpenCards((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const handleFileClick = (index: number) => {
    setSelectedFileIndex(index);
    setOpenCards([]); // Reset opened cards when switching files
  };

  const selectedFile = selectedFileIndex !== null ? inputData[selectedFileIndex] : null;

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 pt-16 sm:pt-20">
      {/* Background */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[linear-gradient(100deg,rgba(216,213,255,1)_9%,rgba(225,186,213,1)_100%)] border-[5px] border-white rounded-2xl"/>
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px]" />

      {/* File Navigation - Horizontal buttons */}
      <div className="mb-6 sm:mb-8 lg:mb-10 flex flex-wrap justify-center gap-3 sm:gap-4 w-full max-w-7xl">
        {inputData.map((fileData, index) => (
          <div
            key={`file-${index}`}
            id={`file-card-${index}`}
            className={`flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 rounded-3xl shadow-[4px_4px_25px_#00000040] cursor-pointer transition-all duration-200 ${
              selectedFileIndex === index
                ? "bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)] scale-105"
                : "bg-[linear-gradient(103deg,rgba(160,167,255,0.7)_0%,rgba(168,106,222,0.7)_100%)] hover:scale-102"
            }`}
            onClick={() => handleFileClick(index)}
          >
            <div className={`text-lg sm:text-xl font-bold text-center ${
              selectedFileIndex === index ? "text-white" : "text-white/80"
            }`}>
              {fileData.file}
            </div>
          </div>
        ))}
      </div>

      {/* Show message if no file is selected */}
      {selectedFileIndex === null && (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 text-xl text-center">
            Select a file to view its diagram
          </div>
        </div>
      )}

      {/* Selected File Content */}
      {selectedFile && (
        <>
          {/* Summary */}
          <div id="summary-card" className="mb-8 sm:mb-10 lg:mb-12 w-full max-w-7xl px-4">
            <div className="bg-[#ececec] rounded-3xl shadow-[4px_4px_25px_#00000040] px-4 sm:px-6 py-3 sm:py-4 text-[#491b72] font-mono text-sm sm:text-base text-left">
              {selectedFile.summary}
            </div>
            <Xarrow 
              start={`file-card-${selectedFileIndex}`} 
              end="summary-card" 
              color="white" 
              strokeWidth={2} 
              showHead={false} 
            />
          </div>

          {/* Imports | Functions | Classes */}
          <div className="flex flex-col xl:flex-row justify-center items-start w-full relative space-y-8 xl:space-y-0 xl:space-x-8 px-4 max-w-7xl">
            {/* Imports */}
            <div id="imports-root" className="flex flex-col items-center relative w-full xl:w-1/3">
              <Card
                title="imports"
                nestedItems={(selectedFile.imports ?? []).map((imp) => ({
                  id: `import-${imp}`,
                  label: `import ${imp}`,
                  keyword: "import",
                  name: imp,
                  onClick: () => {},
                }))}
              />
              <Xarrow 
                start="summary-card" 
                end="imports-root" 
                color="white" 
                strokeWidth={2} 
                showHead={false}
                startAnchor="bottom"
                endAnchor="top"
              />
            </div>

            {/* Functions */}
            <div id="functions-root" className="flex flex-col items-center w-full xl:w-1/3 relative">
              <Card
                title="functions"
                nestedItems={(selectedFile.functions ?? []).map((fn) => ({
                  id: `fn-${fn.signature}`,
                  label: `def ${fn.signature}`,
                  keyword: "def",
                  name: fn.signature,
                  isOpen: openCards.includes(fn.signature),
                  onClick: () => {
                    setOpenCards((prev) => {
                      // Get all function signatures to close other functions
                      const allFunctionSignatures = (selectedFile.functions ?? []).map(f => f.signature);
                      // Remove all function popups from previous state
                      const withoutFunctions = prev.filter(name => !allFunctionSignatures.includes(name));
                      // If this function is currently open, close it; otherwise open it
                      const currentlyOpen = prev.includes(fn.signature);
                      return currentlyOpen ? withoutFunctions : [...withoutFunctions, fn.signature];
                    });
                  },
                }))}
              />
              <Xarrow start="summary-card" end="functions-root" color="white" strokeWidth={2} showHead={false} />

              {/* Function popups */}
              {(selectedFile.functions ?? []).map((fn) => {
                if (!openCards.includes(fn.signature)) return null;
                const popupTitle = fn.signature.replace(/\(.*\)/, "");
                return (
                  <div
                    key={fn.signature + "-popup"}
                    id={`popup-${fn.signature}`}
                    className="relative w-full flex justify-center mt-3"
                  >
                    <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
                      <Card
                        title={popupTitle}
                        description={fn.description ?? `explanation for ${popupTitle}`}
                      />
                    </div>
                    <Xarrow
                      startAnchor="bottom"
                      endAnchor="top"
                      start={`fn-${fn.signature}`}
                      end={`popup-${fn.signature}`}
                      color="white"
                      strokeWidth={2}
                      showHead={false}
                    />
                  </div>
                );
              })}
            </div>

            {/* Classes */}
            <div id="classes-root" className="flex flex-col items-center relative w-full xl:w-1/3">
              <Card
                title="classes"
                nestedItems={(selectedFile.classes ?? []).map((cls: any, i: number) => ({
                  id: `cls-${cls.name}`,
                  label: `class ${cls.name}`,
                  keyword: "class",
                  name: cls.name,
                  isOpen: openCards.includes(cls.name),
                  onClick: () =>
                    setOpenCards((prev) => {
                      const otherClassNames = (selectedFile.classes ?? [])
                        .map((c: any, idx: number) => (idx === i ? null : c?.name))
                        .filter(Boolean) as string[];
                      const allFunctionNames = (selectedFile.classes ?? [])
                        .map((c: any) => c.functions?.map((fn: any) => fn.name || fn.signature || 'unnamed_function') ?? [])
                        .flat();
                      let pruned = prev.filter(
                        (name) =>
                          !otherClassNames.includes(name) &&
                          !allFunctionNames.includes(name)
                      );
                      const currentlyOpen = prev.includes(cls.name);
                      return currentlyOpen ? [] : [cls.name];
                    }),
                }))}
              />
              <Xarrow 
                start="summary-card" 
                end="classes-root" 
                color="white" 
                strokeWidth={2} 
                showHead={false}
                startAnchor="bottom"
                endAnchor="top"
              />

              {/* Class popups */}
              {(selectedFile.classes ?? []).map((cls: any) => {
                if (!openCards.includes(cls.name)) return null;
                
                // Only show functions if they actually exist in the class
                const actualFunctions = cls.functions ?? [];
                const functionNames: string[] = actualFunctions.map((fn: any) => fn.name || fn.signature || 'unnamed_function');
                
                const nestedClass = cls.nestedClass ?? "Blahblah(Node)";
                const nestedClassTitle = nestedClass.replace(/\(.*\)/, "");
                const nestedExplanation = cls.nestedExplanation ?? `explanation for ${nestedClassTitle}`;

                return (
                  <React.Fragment key={cls.name + "-fragment"}>
                    {/* Class popup */}
                    <div
                      id={`popup-${cls.name}`}
                      className="relative w-full flex justify-center mt-2"
                    >
                      <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
                        <Card
                          title={cls.name.replace(/\(.*\)/, "")}
                          description={cls.description ?? `explanation for ${cls.name.replace(/\(.*\)/, "")}`}
                          nestedItems={actualFunctions.length > 0 ? functionNames.map((fnName) => ({
                            id: `innerfn-${fnName}`,
                            label: `def ${fnName}`,
                            keyword: "def",
                            name: fnName,
                            isOpen: openCards.includes(fnName),
                            onClick: () => {
                              setOpenCards((prev) => {
                                const allFunctionNames = (selectedFile.classes ?? [])
                                  .map((c: any) => (c.functions ?? []).map((fn: any) => fn.name || fn.signature || 'unnamed_function'))
                                  .flat();
                                let pruned = prev.filter(
                                  (name) => !allFunctionNames.includes(name)
                                );
                                const currentlyOpen = prev.includes(fnName);
                                return currentlyOpen
                                  ? pruned.filter((name) => name !== fnName)
                                  : [fnName, ...pruned];
                              });
                            },
                          })) : []}
                        />
                      </div>
                      <Xarrow
                        start={`cls-${cls.name}`}
                        end={`popup-${cls.name}`}
                        color="white"
                        strokeWidth={2}
                        showHead={false}
                        startAnchor="bottom"
                        endAnchor="top"
                        path="straight"
                      />
                    </div>

                    {/* Function popups inside class - only show if functions exist */}
                    {actualFunctions.length > 0 && functionNames.map((fnName) => {
                      if (!openCards.includes(fnName)) return null;
                      const functionTitle = fnName.replace(/\(.*\)/, "");
                      const functionData = actualFunctions.find((fn: any) => (fn.name || fn.signature) === fnName);
                      return (
                        <div
                          key={fnName + "-popup"}
                          id={`popup-${fnName}`}
                          className="relative w-full flex justify-center mt-2"
                        >
                          <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
                            <Card 
                              title={functionTitle} 
                              description={functionData?.description ?? `explanation for ${functionTitle}`} 
                            />
                          </div>
                          <Xarrow
                            start={`innerfn-${fnName}`}
                            end={`popup-${fnName}`}
                            color="white"
                            strokeWidth={2}
                            showHead={false}
                            startAnchor="bottom"
                            endAnchor="top"
                            path="straight"
                          />
                        </div>
                      );
                    })}

                    {/* Nested class popup */}
                    {openCards.includes(nestedClass) && (
                      <div
                        key={nestedClass + "-popup"}
                        id={`popup-${nestedClass}`}
                        className="relative w-full flex justify-center mt-2"
                      >
                        <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
                          <Card title={nestedClassTitle} description={nestedExplanation} />
                        </div>
                        <Xarrow
                          start={`popup-${cls.name}`}
                          end={`popup-${nestedClass}`}
                          color="white"
                          strokeWidth={2}
                          showHead={false}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MultiDiagram;