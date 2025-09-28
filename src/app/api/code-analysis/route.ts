import { NextRequest, NextResponse } from "next/server";
import { mastra } from "../../../mastra/index";

export async function POST(req: NextRequest) {
  try {
    const { repositoryUrl } = await req.json();

    if (!repositoryUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(repositoryUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid repository URL format" },
        { status: 400 }
      );
    }

    console.log(`Starting code analysis for repository: ${repositoryUrl}`);

  // Step 1: Get code using the repository fetch agent (repoAnalyst)
  const getCodeAgent = mastra.getAgent("repoAnalyst");
    if (!getCodeAgent) {
      throw new Error("Get code agent not found");
    }

    console.log("Fetching repository code...");
    const codeResult = await getCodeAgent.generate([
      {
        role: "user",
        content: `Fetch ALL source code from this GitHub repository: ${repositoryUrl}

STEP 1: Parse the URL
- Repository URL: ${repositoryUrl}
- Extract owner and repo name from the URL

STEP 2: Use GitHub MCP tools
- Use the available GitHub tools to list repository contents
- For each file, use the GitHub tools with proper parameters (owner, repo, path)
- Example: if repo is "owner/repo" and file is "README.md", call tool with owner="owner", repo="repo", path="README.md"

STEP 3: Return ONLY this JSON format:
{
  "repository_info": {
    "url": "${repositoryUrl}",
    "owner": "extracted_owner_name",
    "name": "extracted_repo_name"
  },
  "files": {
    "README.md": "actual file content here",
    "src/main.js": "actual file content here"
  }
}

CRITICAL: Use GitHub MCP tools properly with all required parameters. NO markdown formatting, ONLY the JSON.`,
      },
    ]);

    // Try to parse the code result to validate it's proper JSON
    let codeData;
    let codeParseError = null;
    try {
      codeData = JSON.parse(codeResult.text);
      console.log(`Successfully parsed code structure. Found ${Object.keys(codeData.files || {}).length} files.`);
    } catch (error) {
      console.warn("Code result is not valid JSON, proceeding with raw text");
      codeParseError = error instanceof Error ? error.message : "Unknown parsing error";
      codeData = { files: { "raw_output.txt": codeResult.text } };
    }

  // Step 2: Identify features using the analyseFileAgent
  const featuresAgent = (mastra as any).getAgent("analyseFileAgent");
    if (!featuresAgent) {
      throw new Error("Code Features Identifier agent not found");
    }

    console.log("Analyzing code features...");
    const featuresResult = await featuresAgent.generate([
      {
        role: "user",
        content: `Analyze the following repository code and extract ALL code features.

Repository: ${repositoryUrl}

Repository Structure: ${codeData.repository_info ? JSON.stringify(codeData.repository_info) : "Unknown"}

Files and their contents:
${JSON.stringify(codeData.files || codeData, null, 2)}

Return ONLY valid JSON with extracted features (classes, functions, variables, etc.) for each file. NO markdown formatting.`,
      },
    ]);

    // Try to parse the JSON result
    let parsedFeatures;
    let status = "success";
    let error = undefined;

    try {
      parsedFeatures = JSON.parse(featuresResult.text);
    } catch (parseError) {
      console.warn("Failed to parse features as JSON, returning raw text");
      parsedFeatures = featuresResult.text;
      status = "parsing_warning";
      error = parseError instanceof Error ? parseError.message : "JSON parsing failed";
    }

    console.log("Code analysis completed successfully");

    return NextResponse.json({
      success: true,
      repositoryUrl,
      codeData: codeData, // Include parsed code structure
      codeParseError: codeParseError, // Include any parsing errors
      rawCodeOutput: codeResult.text.substring(0, 1000) + "...", // First 1000 chars for debugging
      features: parsedFeatures,
      rawFeaturesOutput: featuresResult.text.substring(0, 1000) + "...", // First 1000 chars for debugging
      status,
      error,
      debug: {
        codeOutputLength: codeResult.text.length,
        featuresOutputLength: featuresResult.text.length,
        filesFound: Object.keys(codeData.files || {}).length,
      }
    });

  } catch (error) {
    console.error("Code analysis failed:", error);

    return NextResponse.json(
      {
        error: "Code analysis failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Code Analysis API",
    description: "POST a repository URL to analyze its code structure and extract features",
    example: {
      repositoryUrl: "https://github.com/owner/repo"
    }
  });
}