
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';

import { sequentialPipeline } from './workflows/test-workflow';
import { analyseFileAgent } from "./agents/analyse_file";
import { analyseRelationsAgent } from "./agents/analyse_relations";
import { fetchRepoAgent } from "./agents/fetch_repo";
import { IdentifyAbstractionAgent } from "./agents/identify_abstractions";
import { OrderChaptersAgent } from "./agents/order_chapters";
import { WriteChapterAgent } from "./agents/write_chapter";

export const mastra = new Mastra({
  workflows: { sequentialPipeline }, //weatherWorkflow
  agents: { fetchRepoAgent, IdentifyAbstractionAgent, analyseRelationsAgent, OrderChaptersAgent, WriteChapterAgent, analyseFileAgent }, //weatherAgent
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
