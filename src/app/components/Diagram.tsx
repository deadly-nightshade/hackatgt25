"use client";
import React, { useState } from "react";
import { DiagramData } from "./types";
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
      {/* Full-screen background gradient */}
      <div className="fixed inset-0 w-full h-full -z-10 bg-[linear-gradient(100deg,rgba(216,213,255,1)_9%,rgba(225,186,213,1)_100%)] border-[5px] border-white rounded-2xl"/>
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px]" />

      {/* File (clickable) */}
      <div className="mb-2 flex flex-col items-center">
        <div
          className="flex items-center justify-center px-6 py-3 rounded-3xl shadow-[4px_4px_25px_#00000040] bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)] cursor-pointer"
          onClick={handleFileClick}
        >
          <div className="text-white text-xl font-bold">
            {inputData.file}
          </div>
        </div>
      </div>

      {/* Connecting line to summary - now below the file card */}
      {showContent && (
        <div className="w-0.5 h-16 bg-white mx-auto" style={{marginTop: "-8px", marginBottom: "-20px"}}></div>
      )}

      {/* Summary */}
      {showContent && (
        <div className="mb-12">
          <div className="bg-[#ececec] rounded-3xl shadow-[4px_4px_25px_#00000040] px-6 py-4 text-[#491b72] font-mono text-base w-[1177px] text-left">
            {inputData.summary}
          </div>
        </div>
      )}

      {/* Main row: imports | functions | classes */}
      {showContent && (
        <div className="flex justify-center items-start w-300 relative">
          {/* Imports column */}
          <div className="flex flex-col items-center relative">
            <Card
              title="imports"
              nestedItems={(inputData.imports ?? []).map((imp) => ({
                label: `import ${imp}`,
                keyword: "import",
                name: imp,
                onClick: () => {},
              }))}
            />
          </div>

          {/* Functions column */}
          <div className="flex flex-col items-center w-full relative mt-[30px]">
            <Card
              title="functions"
              className="mt-[25px]"
              nestedItems={(inputData.functions ?? []).map((fn) => ({
                label: `def ${fn.signature}`,
                keyword: "def",
                name: fn.signature,
                isOpen: openCards.includes(fn.signature),
                onClick: () => toggle(fn.signature),
              }))}
            />

            {/* Function popups */}
            {(inputData.functions ?? []).map((fn) => {
              if (!openCards.includes(fn.signature)) return null;
              const popupTitle = fn.signature.replace(/\(.*\)/, "");
              return (
                <div
                  key={fn.signature + "-popup"}
                  className="relative w-full flex justify-center"
                  style={{ marginTop: "5px" }}
                >
                  <div className="w-[350px]">
                    <Card
                      title={popupTitle}
                      description={
                        fn.description ?? `explanation for ${popupTitle}`
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Classes column */}
          <div className="flex flex-col items-center relative">
            <Card
              title="classes"
              nestedItems={(inputData.classes ?? []).map((cls: any, i: number) => ({
                label: `class ${cls.name}`,
                keyword: "class",
                name: cls.name,
                isOpen: openCards.includes(cls.name),
                onClick: () =>
                  setOpenCards((prev) => {
                    // Gather all class names except the one being opened
                    const otherClassNames = (inputData.classes ?? [])
                      .map((c: any, idx: number) => (idx === i ? null : c?.name))
                      .filter(Boolean) as string[];
                    // Gather all function names from all classes
                    const allFunctionNames = (inputData.classes ?? [])
                      .map((c: any) => c.popupFunctionNames ?? ["function_name()"])
                      .flat();
                    // Remove all other class and function popups
                    let pruned = prev.filter((name) => !otherClassNames.includes(name) && !allFunctionNames.includes(name));
                    const currentlyOpen = prev.includes(cls.name);
                    return currentlyOpen
                      ? []
                      : [cls.name];
                  }),
              }))}
            />

            {/* Class popups */}
            {(inputData.classes ?? []).map((cls: any) => {
              if (!openCards.includes(cls.name)) return null;
              const functionNames: string[] = cls.popupFunctionNames ?? ["function_name()"];
              const nestedClass = cls.nestedClass ?? "Blahblah(Node)";
              const nestedClassTitle = nestedClass.replace(/\(.*\)/, "");
              const nestedExplanation =
                cls.nestedExplanation ??
                `explanation for ${nestedClassTitle}`;
              return (
                <React.Fragment key={cls.name + "-fragment"}>
                  <div
                    key={cls.name + "-popup"}
                    className="relative w-full flex justify-center"
                    style={{ marginTop: "1px" }}
                  >
                    <div className="w-[350px]">
                      <Card
                        title={cls.name.replace(/\(.*\)/, "")}
                        description={
                          cls.description ??
                          `explanation for ${cls.name.replace(/\(.*\)/, "")}`
                        }
                        nestedItems={functionNames.map((fnName) => ({
                          label: `def ${fnName}`,
                          keyword: "def",
                          name: fnName,
                          isOpen: openCards.includes(fnName),
                          onClick: () => {
                            setOpenCards((prev) => {
                              // Gather all function names from all classes
                              const allFunctionNames = (inputData.classes ?? [])
                                .map((c: any) => c.popupFunctionNames ?? ["function_name()"])
                                .flat();
                              // Remove all function popups
                              let pruned = prev.filter((name) => !allFunctionNames.includes(name));
                              const currentlyOpen = prev.includes(fnName);
                              return currentlyOpen
                                ? pruned.filter((name) => name !== fnName)
                                : [fnName, ...pruned];
                            });
                          },
                        }))}
                      />
                    </div>
                  </div>

                  {/* Function popups for each function name */}
                  {functionNames.map((fnName) => {
                    const functionTitle = fnName.replace(/\(.*\)/, "");
                    return openCards.includes(fnName) ? (
                      <div
                        key={fnName + "-popup"}
                      className="relative w-full flex justify-center"
                      style={{ marginTop: "1px" }}
                    >
                      <div className="w-[350px]">
                        <Card
                            title={functionTitle}
                          description={`explanation for ${functionTitle}`}
                        />
                      </div>
                    </div>
                    ) : null;
                  })}
                  

                  {/* Nested class popup */}
                  {openCards.includes(nestedClass) && (
                    <div
                      key={nestedClass + "-popup"}
                      className="relative w-full flex justify-center"
                      style={{ marginTop: "1px" }}
                    >
                      <div className="w-[350px]">
                        <Card
                          title={nestedClassTitle}
                          description={nestedExplanation}
                        />
                      </div>
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