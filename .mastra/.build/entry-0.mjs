import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

createStep({
  id: "fetch-repo-step",
  description: "Fetch Repo Step",
  inputSchema: z.object({
    repoUrl: z.string().url()
  }),
  outputSchema: z.object({
    repoContent: z.string()
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }
    const repoContent = `Fetched content from ${inputData.repoUrl}`;
    return { repoContent };
  }
});
createStep({
  id: "identify-abstractions-step",
  description: "Identify Abstractions Step",
  inputSchema: z.object({
    repoContent: z.string()
  }),
  outputSchema: z.object({
    abstractions: z.string()
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }
    const agent = mastra?.getAgent("IdentifyAbstractionsAgent");
    if (!agent) {
      throw new Error("Agent not found");
    }
    const prompt = ``;
    const response = await agent.generate([
      { role: "user", content: prompt }
    ]);
    const abstractionsMap = /* @__PURE__ */ new Map();
    response.text.split("\n").forEach((line) => {
      const [abstraction, fileOrFolder] = line.split(":").map((part) => part.trim());
      if (abstraction && fileOrFolder) {
        abstractionsMap.set(abstraction, fileOrFolder);
      }
    });
    return { abstractions: JSON.stringify(Array.from(abstractionsMap.entries())) };
  }
});
const sequentialPipeline = createWorkflow({
  id: "sequential-agent-pipeline",
  inputSchema: z.object({
    repoUrl: z.string().url()
  }),
  outputSchema: z.object({
    finalOutput: z.string()
  })
});
sequentialPipeline.commit();

const analyseFileAgent = new Agent({
  name: "File Analysis Agent",
  instructions: `Hey
    `,
  model: google("gemini-2.5-pro"),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db"
      // path is relative to the .mastra/output directory
    })
  })
});

const analyseRelationsAgent = new Agent({
  name: "Analyse Relations Agent",
  instructions: `Hey
    `,
  model: google("gemini-2.5-pro"),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db"
      // path is relative to the .mastra/output directory
    })
  })
});

const fetchRepoAgent = new Agent({
  name: "Fetch Repo Agent",
  instructions: `Hey
    `,
  model: google("gemini-2.5-pro"),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db"
      // path is relative to the .mastra/output directory
    })
  })
});

const IdentifyAbstractionAgent = new Agent({
  name: "Identify Abstractions Agent",
  instructions: `Hey
    `,
  model: google("gemini-2.5-pro"),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db"
      // path is relative to the .mastra/output directory
    })
  })
});

const OrderChaptersAgent = new Agent({
  name: "Order Chapters Agent",
  instructions: `Hey
    `,
  model: google("gemini-2.5-pro"),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db"
      // path is relative to the .mastra/output directory
    })
  })
});

const WriteChapterAgent = new Agent({
  name: "Write Chapter Agent",
  instructions: `Hey
    `,
  model: google("gemini-2.5-pro"),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db"
      // path is relative to the .mastra/output directory
    })
  })
});

const mastra = new Mastra({
  workflows: {
    sequentialPipeline
  },
  //weatherWorkflow
  agents: {
    fetchRepoAgent,
    IdentifyAbstractionAgent,
    analyseRelationsAgent,
    OrderChaptersAgent,
    WriteChapterAgent,
    analyseFileAgent
  },
  //weatherAgent
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:"
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  })
});

export { mastra };
