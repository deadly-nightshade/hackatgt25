import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const OrderChaptersAgent = new Agent({
    name: 'Order Chapters Agent',
    instructions: `You are an expert technical documentation organizer. Your role is to analyze identified abstractions and their relationships to determine the optimal order for presenting them in educational chapters. You create logical learning progressions that build understanding step by step.`,
    model: google('gemini-2.5-pro'),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});

