import path from "node:path";
import fs from "node:fs";
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import 'dotenv/config';

const dbDir = path.resolve(process.cwd(), ".mastra");
const dbPath = path.join(dbDir, "mastra.db");

// Ensure the directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Local file DB by default; switch to Turso by setting env vars later.
const store = new LibSQLStore({
  // Local libsql file; it will be created if missing
  url: `file:${dbPath}`,
  authToken: process.env.LIBSQL_AUTH_TOKEN, // not needed for local file
});

export const memory = new Memory({ storage: store });