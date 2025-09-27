import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

import { analyseFileAgent } from "../agents/analyse_file";
import { analyseRelationsAgent } from "../agents/analyse_relations";
import { repoAnalyst } from "../agents/fetch_repo";
import { IdentifyAbstractionAgent } from "../agents/identify_abstractions";
import { OrderChaptersAgent } from "../agents/order_chapters";
import { WriteChapterAgent } from "../agents/write_chapter";

const fetchRepoStep = createStep({
    id: "fetch-repo-step",
    description: "Fetch and analyze repository from GitHub URL",
    inputSchema: z.object({
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        repoContent: z.string(),
        repoAnalysis: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('repoAnalyst');
        if (!agent) {
            throw new Error("repoAnalyst agent not found");
        }

        const prompt = `Analyze the GitHub repository at: ${inputData.repoUrl}. Provide a comprehensive overview of the repository structure, main files, and overall purpose.`;

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        return { 
            repoContent: response.text,
            repoAnalysis: response.text 
        };
    }
});

const identifyAbstractionsStep = createStep({
    id: "identify-abstractions-step",
    description: "Identify key abstractions from repository analysis",
    inputSchema: z.object({
        repoContent: z.string(),
        repoAnalysis: z.string(),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        const agent = mastra?.getAgent('IdentifyAbstractionAgent');
        if (!agent) {
            throw new Error("IdentifyAbstractionAgent not found");
        }

        const prompt = `Based on this repository analysis:

${inputData.repoAnalysis}

Identify the key abstractions, patterns, and architectural concepts in this codebase. Focus on:
- Main classes, interfaces, or data structures
- Design patterns used
- Core business logic abstractions
- Key architectural components

Provide a clear list of the most important abstractions.`;

        const response = await agent.generate([
            { role: 'user', content: prompt }
        ]);

        // Parse abstractions from response
        const abstractionsList = response.text
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.replace(/^[-*•]\s*/, '').trim())
            .filter(line => line.length > 0);

        return { 
            abstractions: response.text,
            abstractionsList: abstractionsList
        };
    }
});


const sequentialPipeline = createWorkflow({
    id: "github-analysis-workflow",
    inputSchema: z.object({
        repoUrl: z.string().url(),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
    }),
})
   .then(fetchRepoStep)
   .then(identifyAbstractionsStep)
   .then(createStep({
    id: "final-output-step",
    description: "Format final output with repository analysis and abstractions",
    inputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
    }),
    outputSchema: z.object({
        abstractions: z.string(),
        abstractionsList: z.array(z.string()),
    }),
    execute: async ({ inputData }) => {
        if (!inputData) {
            throw new Error("Input data not found");
        }

        return {
            abstractions: inputData.abstractions,
            abstractionsList: inputData.abstractionsList,
        };
    }
}));

sequentialPipeline.commit();
export { sequentialPipeline };