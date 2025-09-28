import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const analyseFileAgent = new Agent({
    name: 'File Analysis Agent',
    instructions: `You are a code analysis expert specializing in examining individual source files. Your role is to analyze code structure, identify key functions, classes, and patterns within specific files, and explain how they contribute to the overall system architecture.`,
    model: google('gemini-2.5-flash'),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});

