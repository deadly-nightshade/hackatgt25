// app/api/files/route.ts
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data/code");

export async function GET() {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
    
    // Track seen repoUrls to filter duplicates
    const seenRepoUrls = new Set<string>();
    const uniqueFiles: string[] = [];
    
    // Process each file to check for duplicate repoUrls
    for (const fileName of files) {
      try {
        const filePath = path.join(DATA_DIR, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Extract repoUrl from the JSON structure
        // Handle different possible structures: direct repoUrl or nested in payload
        let repoUrl = jsonData.repoUrl || jsonData.payload?.repoUrl;
        
        // Normalize the repoUrl for comparison
        if (repoUrl) {
          // Remove protocol and standardize format
          repoUrl = repoUrl.replace(/^https?:\/\//, '').replace(/^github\.com\//, '');
        }
        
        // Only include files with unique repoUrls
        if (!repoUrl || !seenRepoUrls.has(repoUrl)) {
          if (repoUrl) {
            seenRepoUrls.add(repoUrl);
          }
          uniqueFiles.push(fileName);
        } else {
          console.log(`Filtering out duplicate repository: ${fileName} (${repoUrl})`);
        }
      } catch (parseError) {
        console.warn(`Could not parse ${fileName}, including it anyway:`, parseError);
        // Include files that can't be parsed to avoid breaking existing functionality
        uniqueFiles.push(fileName);
      }
    }
    
    return NextResponse.json({ files: uniqueFiles });
  } catch (err) {
    return NextResponse.json({ error: "Could not read directory" }, { status: 500 });
  }
}
