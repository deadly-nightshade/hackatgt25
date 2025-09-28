// app/api/save/route.ts
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data");

export async function POST(req: NextRequest) {
  try {
    const { fileName, content } = await req.json();
    fs.writeFileSync(path.join(DATA_DIR, fileName), content);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Could not save file" }, { status: 500 });
  }
}
