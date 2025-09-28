export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, service: "mastra-backend", time: new Date().toISOString() });
}
