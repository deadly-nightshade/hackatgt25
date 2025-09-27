import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const OrderChaptersAgent = new Agent({
    name: 'Order Chapters Agent',
    instructions: 
    `Hey
    `,
  model: google('gemini-2.5-pro'),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});

