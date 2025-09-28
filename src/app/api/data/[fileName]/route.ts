// app/api/data/[fileName]/route.ts
import fs from "fs";
import path from "path";
import { NextResponse, NextRequest } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data");

export async function GET(req: NextRequest) {
  // await the params from the request
  const { searchParams, pathname } = new URL(req.url);
  
  // Extract fileName from the pathname
  // pathname: /api/data/yourFile.json
  const parts = pathname.split('/');
  const fileName = decodeURIComponent(parts[parts.length - 1]);

  const filePath = path.join(DATA_DIR, fileName);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return new NextResponse(JSON.stringify({ error: "File not found" }), { status: 404 });
  }
}
