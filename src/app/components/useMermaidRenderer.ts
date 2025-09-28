"use client";

import { useEffect } from "react";
import mermaid from "mermaid";

export function useMermaidRenderer() {
  useEffect(() => {
    // Initialize once (ignore double-init errors in fast refresh)
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "monospace",
        themeCSS: `
          .node rect, .node circle, .node ellipse, .node polygon {
            fill: #ececec;
            stroke: #491b72;
            stroke-width: 2px;
          }
          .node .label {
            color: #491b72;
            font-family: monospace;
          }
          .edgePath .path {
            stroke: #491b72;
            stroke-width: 2px;
          }
          .edgeLabel {
            background-color: #ececec;
            color: #491b72;
            font-family: monospace;
          }
        `,
      });
    } catch {
      /* no-op */
    }

    const renderMermaidDiagrams = async () => {
      // Only unrendered placeholders
      const placeholders = document.querySelectorAll<HTMLDivElement>(
        ".mermaid-placeholder:not(.rendered)"
      );

      for (const placeholder of Array.from(placeholders)) {
        const encoded = placeholder.getAttribute("data-mermaid-code");
        const id =
          placeholder.getAttribute("data-mermaid-id") ||
          `diagram-${Math.random().toString(36).slice(2)}`;

        if (!encoded) {
          placeholder.classList.add("rendered");
          continue;
        }

        const code = decodeURIComponent(encoded);

        try {
          const { svg } = await mermaid.render(id, code);
          placeholder.innerHTML = svg;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          placeholder.innerHTML = `<div class="text-red-500 p-4 font-mono">Error rendering diagram: ${message}</div>`;
        } finally {
          // Always mark as rendered to avoid infinite re-attempts
          placeholder.classList.add("rendered", "mermaid-diagram");
          placeholder.classList.remove("mermaid-placeholder");
        }
      }
    };

    // Initial render
    void renderMermaidDiagrams();

    // Watch for newly inserted placeholders (e.g., navigating chapters)
    const observer = new MutationObserver((mutations) => {
      const needsRender = mutations.some((m) =>
        Array.from(m.addedNodes).some((n) => {
          if (n.nodeType !== Node.ELEMENT_NODE) return false;
          const el = n as Element;
          return (
            el.classList?.contains("mermaid-placeholder") ||
            !!el.querySelector?.(".mermaid-placeholder:not(.rendered)")
          );
        })
      );
      if (needsRender) {
        // Small delay so DOM settles
        window.setTimeout(() => void renderMermaidDiagrams(), 100);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}
