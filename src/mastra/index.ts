import { Mastra } from '@mastra/core/mastra';
import { repoAnalyst } from "./agents/fetch_repo";
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { memory } from './memory';
import 'dotenv/config';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, repoAnalyst },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

// Re-export memory for convenience
export { memory } from './memory';
