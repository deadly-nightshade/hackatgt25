import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const WriteChapterAgent = new Agent({
    name: 'Write Chapter Agent',
    instructions: `You are a technical writing expert specializing in creating clear, comprehensive documentation chapters. Your role is to transform complex code analyses and abstractions into well-structured, beginner-friendly chapters that help readers understand software architecture and implementation details.`,
    model: google('gemini-2.5-pro'),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});

