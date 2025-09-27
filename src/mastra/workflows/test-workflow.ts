import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { analyseFileAgent } from "../agents/analyse_file";
import { analyseRelationsAgent } from "../agents/analyse_relations";
import { fetchRepoAgent } from "../agents/fetch_repo";
import { IdentifyAbstractionAgent } from "../agents/identify_abstractions";
import { OrderChaptersAgent } from "../agents/order_chapters";
import { WriteChapterAgent } from "../agents/write_chapter";

const fetchRepoStep = createStep({
    id: "fetch-repo-step",
    description: "Fetch Repo Step",
    inputSchema: z.object({
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        repoContent: z.string(),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }
        // use tool or agent to fetch repo
        const repoContent = `Fetched content from ${inputData.repoUrl}`;
        return { repoContent };
    }
});

const identifyAbstractionsStep = createStep({
    id: "identify-abstractions-step",
    description: "Identify Abstractions Step",
    inputSchema: z.object({
        repoContent: z.string(),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('IdentifyAbstractionsAgent');
        if (!agent) {
            throw new Error("Agent not found");
        }

        const prompt = ``;

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        const abstractionsMap = new Map<string, string>();

        response.text.split('\n').forEach(line => {
            const [abstraction, fileOrFolder] = line.split(':').map(part => part.trim());
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
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        finalOutput: z.string(),
    }),
})
   .then(fetchRepoStep)
//   .then(identifyAbstractionsStep)
//   .then(analyzeRelationsStep)
//   .then(orderChaptersStep)
//   .then(writeChaptersStep)
//   .then(analyzeFileStep);

sequentialPipeline.commit();
export { sequentialPipeline };