import { runFinalWorkflow } from '../workflows/finalWorkflow';

const ALLOW = ["https://gitgood.work", "https://www.gitgood.work", "http://localhost:3000"];

function allow(res: any, origin?: string) {
  const o = ALLOW.includes(origin || "") ? origin! : ALLOW[0];
  res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    allow(res, req.headers.origin as string);
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).send("Use POST");

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const repoUrl: string | undefined = body?.repoUrl;
    if (!repoUrl) {
      allow(res, req.headers.origin as string);
      return res.status(400).json({ error: "repoUrl required" });
    }

    const final = await runFinalWorkflow({ repoUrl });
    allow(res, req.headers.origin as string);
    return res.status(200).json(final);
  } catch (e: any) {
    console.error(e);
    allow(res, req.headers.origin as string);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
