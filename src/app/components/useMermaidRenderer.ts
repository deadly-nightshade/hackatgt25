import { useEffect } from 'react';
import mermaid from 'mermaid';

export function useMermaidRenderer() {
  useEffect(() => {
    // Initialize Mermaid once
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
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
      `
    });
    
    const renderMermaidDiagrams = async () => {
      // Only select unrendered placeholders
      const placeholders = document.querySelectorAll('.mermaid-placeholder:not(.rendered)');
      console.log(`Found ${placeholders.length} Mermaid placeholders to render`);
      
      for (const placeholder of placeholders) {
        const mermaidCode = decodeURIComponent(placeholder.getAttribute('data-mermaid-code') || '');
        const diagramId = placeholder.getAttribute('data-mermaid-id') || `diagram-${Math.random()}`;
        
        if (mermaidCode) {
          try {
            console.log('Rendering Mermaid diagram:', diagramId);
            const { svg } = await mermaid.render(diagramId, mermaidCode);
            placeholder.innerHTML = svg;
            placeholder.classList.add('rendered', 'mermaid-diagram');
            placeholder.classList.remove('mermaid-placeholder');
          } catch (error) {
            console.error('Mermaid render error:', error);
            placeholder.innerHTML = `<div class="text-red-500 p-4 font-mono">Error rendering diagram: ${error.message}</div>`;
            placeholder.classList.add('rendered');
          }
        }
      }
    };
    
    // Render immediately
    renderMermaidDiagrams();
    
    // Set up observer for new content (like when navigating between chapters)
    const observer = new MutationObserver((mutations) => {
      let hasNewPlaceholders = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if the added node contains mermaid placeholders
            if (element.classList?.contains('mermaid-placeholder') || 
                element.querySelector?.('.mermaid-placeholder:not(.rendered)')) {
              hasNewPlaceholders = true;
            }
          }
        });
      });
      
      if (hasNewPlaceholders) {
        // Small delay to ensure DOM is fully updated
        setTimeout(renderMermaidDiagrams, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
}