import { mastra } from "../index";
import { sequentialPipeline } from "./test-workflow";

export async function runFinalWorkflow({ repoUrl }: { repoUrl: string }) {
  const wf: any = sequentialPipeline as any;
  const result = await wf.run({
    inputData: { repoUrl },
    mastra,
  });
  return {
    status: "succeeded",
    result,
    payload: { repoUrl },
  };
}
