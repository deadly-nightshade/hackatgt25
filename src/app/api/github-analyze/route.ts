// src/app/api/github-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analyzeGitHubRepository, type RepositoryAnalysis } from '../../../github-analyzer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, branch, token } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'GitHub repository URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    const githubUrlPattern = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+/;
    if (!githubUrlPattern.test(url)) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL format' },
        { status: 400 }
      );
    }

    console.log(`Starting analysis of repository: ${url}`);

    const analysis: RepositoryAnalysis = await analyzeGitHubRepository(url, {
      token: token || process.env.GITHUB_TOKEN,
      branch: branch,
      saveToFile: false, // Don't save to file in API endpoint
    });

    console.log(`Analysis completed: ${analysis.totalFiles} files, ${analysis.totalDirectories} directories`);

    return NextResponse.json({
      success: true,
      data: analysis,
      message: `Successfully analyzed ${analysis.repository.fullName}`,
    });

  } catch (error: any) {
    console.error('GitHub analysis error:', error);

    // Handle specific error types
    if (error.message.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: 'GitHub API rate limit exceeded. Please try again later or provide a GitHub token.',
          type: 'rate_limit'
        },
        { status: 429 }
      );
    }

    if (error.message.includes('Not Found')) {
      return NextResponse.json(
        { 
          error: 'Repository not found or not accessible. Please check the URL and permissions.',
          type: 'not_found'
        },
        { status: 404 }
      );
    }

    if (error.message.includes('Invalid GitHub URL')) {
      return NextResponse.json(
        { 
          error: 'Invalid GitHub repository URL format',
          type: 'invalid_url'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to analyze repository',
        details: error.message,
        type: 'analysis_error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const branch = searchParams.get('branch') || undefined;

  if (!url) {
    return NextResponse.json(
      { error: 'GitHub repository URL is required as a query parameter' },
      { status: 400 }
    );
  }

  try {
    const analysis: RepositoryAnalysis = await analyzeGitHubRepository(url, {
      token: process.env.GITHUB_TOKEN,
      branch: branch,
      saveToFile: false,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });

  } catch (error: any) {
    console.error('GitHub analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze repository',
        details: error.message
      },
      { status: 500 }
    );
  }
}