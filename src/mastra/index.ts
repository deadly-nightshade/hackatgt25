import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { repositoryParserWorkflow } from './workflows/repository-parser-workflow';
import { weatherAgent } from './agents/weather-agent';
import { repositoryParserAgent } from './agents/repository-parser';

import { sequentialPipeline } from './workflows/test-workflow';
import { testWorkflow } from './workflows/test-simple-workflow';
import { minimalTestWorkflow } from './workflows/minimal-test-workflow';
import { analyzingFilesWorkflow } from './workflows/analyzing-files-workflow';
import { analyseFileAgent } from "./agents/analyse_file";
import { analyseRelationsAgent } from "./agents/analyse_relations";
import { repoAnalyst } from "./agents/fetch_repo";
import { testAgent } from "./agents/test_agent";
import { IdentifyAbstractionAgent } from "./agents/identify_abstractions";
import { OrderChaptersAgent } from "./agents/order_chapters";
import { WriteChapterAgent } from "./agents/write_chapter";
import { AnalyzingFilesAgent } from "./agents/analyzing-files-agent";
import { memory } from './memory';
import 'dotenv/config';

export const mastra = new Mastra({
  workflows: { sequentialPipeline, testWorkflow, minimalTestWorkflow, repositoryParserWorkflow, analyzingFilesWorkflow }, //weatherWorkflow
  agents: { repoAnalyst, testAgent, IdentifyAbstractionAgent, analyseRelationsAgent, OrderChaptersAgent, WriteChapterAgent, analyseFileAgent, repositoryParserAgent, AnalyzingFilesAgent }, //weatherAgent
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
