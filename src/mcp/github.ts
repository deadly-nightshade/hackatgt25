// src/mcp/github.ts
import { MCPClient } from "@mastra/mcp";

let mcp: MCPClient | null = null;

/** Connect once to the GitHub MCP server and reuse the client. */
export function getGithubMcp() {
  if (mcp) return mcp;

  const url = process.env.GITHUB_MCP_URL;
  if (!url) throw new Error("GITHUB_MCP_URL is missing in .env");

  const headers = process.env.GITHUB_MCP_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_MCP_TOKEN}` }
    : undefined;

  mcp = new MCPClient({
    servers: {
      github: {
        url: new URL(url),
        requestInit: headers ? { headers } : undefined,     // for streamable HTTP
        // eventSourceInit: headers ? { headers } : undefined, // for SSE fallback
      },
    },
  });

  return mcp;
}

/** Tools for passing into an Agent definition (namespaced like github_toolName). */
export async function getGithubTools() {
  return await getGithubMcp().getTools();
}