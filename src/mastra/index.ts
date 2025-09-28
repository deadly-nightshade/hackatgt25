import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { sequentialPipeline } from './workflows/test-workflow';
import { analyseCodeWorkflow } from './workflows/analyse-code-workflow';
import { analyseCodeAgent } from "./agents/analyse_code";
import { analyseRelationsAgent } from "./agents/analyse_relations";
import { repoAnalyst } from "./agents/fetch_repo";
import { IdentifyAbstractionAgent } from "./agents/identify_abstractions";
import { OrderChaptersAgent } from "./agents/order_chapters";
import { WriteChapterAgent } from "./agents/write_chapter";
import { fetchCodeAgent} from "./agents/fetch_repo_code";
import { memory } from './memory';
import 'dotenv/config';

export const mastra = new Mastra({
  workflows: { analyseCodeWorkflow, sequentialPipeline }, //weatherWorkflow
  agents: { analyseCodeAgent, fetchCodeAgent, repoAnalyst, IdentifyAbstractionAgent, analyseRelationsAgent, OrderChaptersAgent, WriteChapterAgent}, //weatherAgent
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
