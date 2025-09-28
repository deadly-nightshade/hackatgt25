"use client";
import React, { useState } from "react";
import { DiagramData } from "./types";
import Xarrow from "react-xarrows";
import Card from "./Card";

interface DiagramProps {
  inputData: DiagramData;
}

function Diagram({ inputData }: DiagramProps) {
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [showContent, setShowContent] = useState(false);

  const toggle = (name: string) =>
    setOpenCards((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const handleFileClick = () => setShowContent((prev) => !prev);

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center p-10 pt-20">
      {/* Background */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[linear-gradient(100deg,rgba(216,213,255,1)_9%,rgba(225,186,213,1)_100%)] border-[5px] border-white rounded-2xl"/>
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px]" />

      {/* File */}
      <div id="file-card" className="mb-10 flex flex-col items-center">
        <div
          className="flex items-center justify-center px-6 py-3 rounded-3xl shadow-[4px_4px_25px_#00000040] bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)] cursor-pointer"
          onClick={handleFileClick}
        >
          <div className="text-white text-xl font-bold">{inputData.file}</div>
        </div>
      </div>

      {/* Summary */}
      {showContent && (
        <div id="summary-card" className="mb-12">
          <div className="bg-[#ececec] rounded-3xl shadow-[4px_4px_25px_#00000040] px-6 py-4 text-[#491b72] font-mono text-base w-[1177px] text-left">
            {inputData.summary}
          </div>
          <Xarrow start="file-card" end="summary-card" color="white" strokeWidth={2} showHead={false} />
        </div>
      )}

      {/* Imports | Functions | Classes */}
      {showContent && (
        <div className="flex justify-center items-start w-full relative space-x-12">
          {/* Imports */}
          <div id="imports-root" className="flex flex-col items-center relative">
            <Card
              title="imports"
              nestedItems={(inputData.imports ?? []).map((imp) => ({
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
          <div id="functions-root" className="flex flex-col items-center w-full relative">
            <Card
              title="functions"
              nestedItems={(inputData.functions ?? []).map((fn) => ({
                id: `fn-${fn.signature}`,
                label: `def ${fn.signature}`,
                keyword: "def",
                name: fn.signature,
                isOpen: openCards.includes(fn.signature),
                onClick: () => toggle(fn.signature),
              }))}
            />
            <Xarrow start="summary-card" end="functions-root" color="white" strokeWidth={2} showHead={false} />

            {/* Function popups */}
            {(inputData.functions ?? []).map((fn) => {
              if (!openCards.includes(fn.signature)) return null;
              const popupTitle = fn.signature.replace(/\(.*\)/, "");
              return (
                <div
                  key={fn.signature + "-popup"}
                  id={`popup-${fn.signature}`}
                  className="relative w-full flex justify-center mt-3"
                >
                  <div className="w-[350px]">
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
          <div id="classes-root" className="flex flex-col items-center relative">
            <Card
              title="classes"
              nestedItems={(inputData.classes ?? []).map((cls: any, i: number) => ({
                id: `cls-${cls.name}`,
                label: `class ${cls.name}`,
                keyword: "class",
                name: cls.name,
                isOpen: openCards.includes(cls.name),
                onClick: () =>
                  setOpenCards((prev) => {
                    const otherClassNames = (inputData.classes ?? [])
                      .map((c: any, idx: number) => (idx === i ? null : c?.name))
                      .filter(Boolean) as string[];
                    const allFunctionNames = (inputData.classes ?? [])
                      .map((c: any) => c.popupFunctionNames ?? [""])
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
            {(inputData.classes ?? []).map((cls: any) => {
              if (!openCards.includes(cls.name)) return null;
              const functionNames: string[] = cls.popupFunctionNames ?? [""];
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
                    <div className="w-[350px]">
                      <Card
                        title={cls.name.replace(/\(.*\)/, "")}
                        description={cls.description ?? `explanation for ${cls.name.replace(/\(.*\)/, "")}`}
                        nestedItems={functionNames.map((fnName) => ({
                          id: `innerfn-${fnName}`,
                          label: `def ${fnName}`,
                          keyword: "def",
                          name: fnName,
                          isOpen: openCards.includes(fnName),
                          onClick: () => {
                            setOpenCards((prev) => {
                              const allFunctionNames = (inputData.classes ?? [])
                                .map((c: any) => c.popupFunctionNames ?? [""])
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
                        }))}
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

                  {/* Function popups inside class */}
                  {functionNames.map((fnName) => {
                    if (!openCards.includes(fnName)) return null;
                    const functionTitle = fnName.replace(/\(.*\)/, "");
                    return (
                      <div
                        key={fnName + "-popup"}
                        id={`popup-${fnName}`}
                        className="relative w-full flex justify-center mt-2"
                      >
                        <div className="w-[350px]">
                          <Card title={functionTitle} description={`explanation for ${functionTitle}`} />
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
                      <div className="w-[350px]">
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
      )}
    </div>
  );
}

export default Diagram;