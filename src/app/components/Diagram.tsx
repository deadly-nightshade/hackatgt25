"use client";
import React, { useState } from "react";
import { DiagramData } from "./types";
import Card from "./Card";

interface DiagramProps {
  inputData: DiagramData;
}

const Diagram: React.FC<DiagramProps> = ({ inputData }) => {
  const [openCards, setOpenCards] = useState<string[]>([]);

  const toggle = (name: string) =>
    setOpenCards((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  return (
  <div className="relative w-full min-h-screen flex flex-col items-center p-10 pt-28">
  {/* Full-screen background gradient */}
  <div className="fixed inset-0 w-full h-full -z-10 bg-[linear-gradient(100deg,rgba(216,213,255,1)_9%,rgba(225,186,213,1)_100%)] border-[5px] border-white rounded-2xl"/>
  <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px]"></div>
      {/* Title Banner */}
      <div className="fixed left-0 right-0 top-0 bg-white py-5 flex justify-center items-center mb-4 shadow-[0_2px_8px_#00000010] z-10">
        <h2 className="text-xl font-bold text-[#491b72]">
          The-Pocket / {inputData.title}
        </h2>
      </div>

      {/* File */}
      <div className="mb-2 flex flex-col items-center">
        <div className="flex items-center justify-center px-6 py-3 rounded-3xl shadow-[4px_4px_25px_#00000040] bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)]">
          <div className="text-white text-xl font-bold">
            {inputData.file}
          </div>
        </div>
      </div>

      {/* Connecting line to summary - now below the file card */}
      <div className="w-0.5 h-16 bg-white mx-auto" style={{marginTop: "-8px", marginBottom: "-20px"}}></div>

      {/* Summary */}
      <div className="mb-12">
        <div className="bg-[#ececec] rounded-3xl shadow-[4px_4px_25px_#00000040] px-6 py-4 text-[#491b72] font-mono text-base w-[1177px] text-left">
          {inputData.summary}
        </div>
      </div>

      {/* Main row: imports | functions | classes */}
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
                  const othersOnLine = (inputData.classes ?? [])
                    .map((c: any, idx: number) => (idx === i ? null : c?.name))
                    .filter(Boolean) as string[];
                  const currentlyOpen = prev.includes(cls.name);
                  const pruned = prev.filter(
                    (name) => !othersOnLine.includes(name)
                  );
                  return currentlyOpen
                    ? pruned.filter((name) => name !== cls.name)
                    : [cls.name, ...pruned];
                }),
            }))}
          />

          {/* Class popups */}
          {(inputData.classes ?? []).map((cls: any) => {
            if (!openCards.includes(cls.name)) return null;
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
                      nestedItems={[
                        {
                          label: `class ${nestedClass}`,
                          keyword: "class",
                          name: nestedClass,
                          isOpen: openCards.includes(nestedClass),
                          onClick: () => toggle(nestedClass),
                        },
                      ]}
                    />
                  </div>
                </div>

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
