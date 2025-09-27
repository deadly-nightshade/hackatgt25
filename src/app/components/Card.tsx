import React from "react";

type NestedItem = {
  label: string;
  onClick: () => void;
  isOpen?: boolean;
  keyword?: string;
  name?: string;
};

interface CardProps {
  title: string;
  description?: string | React.ReactNode;
  nestedItems?: NestedItem[];
  children?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  nestedItems,
  children,
  className,
}) => {
  return (
    <div
      className={`inline-block rounded-3xl shadow-[4px_4px_25px_#00000040] min-w-[250px] my-5 ${className ?? ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-center px-6 py-3 rounded-t-3xl bg-[linear-gradient(103deg,rgba(120,127,227,1)_0%,rgba(128,66,182,1)_100%)]">
        <div className="text-white text-lg font-semibold">{title}</div>
      </div>

      {/* Body */}
      <div className="bg-[#ececec] border border-white rounded-b-3xl px-4 py-3 text-[#491b72] font-mono text-sm whitespace-pre-wrap w-full relative">
        {description && <div className="mb-2">{description}</div>}

        {/* nested clickable items (functions/classes/etc.) */}
        {nestedItems &&
          nestedItems.map((item, i) => {
            // If keyword and name are provided, render separately
              if (item.keyword && item.name) {
                return (
                  <div
                    key={i}
                    className="relative flex items-center cursor-pointer mb-1 w-full"
                    onClick={item.onClick}
                  >
                    {item.isOpen && (
                      <span
                        className="absolute left-0 top-0 w-full h-full rounded-md"
                        style={{ background: "rgba(120, 127, 227, 0.20)", zIndex: 0 }}
                      />
                    )}
                    <span className="text-neutral-800 relative z-10 px-1">{item.keyword}</span>
                    <span className="font-bold text-[#491b72] relative z-10 px-2">{item.name}</span>
                  </div>
                );
              }
              // Otherwise, fallback to label
              return (
                <div
                  key={i}
                  className="relative flex flex-col gap-[5px] cursor-pointer mb-1"
                  onClick={item.onClick}
                >
                  {item.isOpen && (
                    <span
                      className="absolute left-0 top-0 w-full h-full rounded-2xl"
                      style={{ background: "rgba(120, 127, 227, 0.20)", zIndex: 0 }}
                    />
                  )}
                  <span className="font-bold text-[#491b72] relative z-10 px-2">{item.label}</span>
                </div>
              );
            })}
        {children}
      </div>
    </div>
  );
};

export default Card;