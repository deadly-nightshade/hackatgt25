import { GitHubService } from '../../../services/github-service';

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();
    
    if (!repoUrl) {
      return Response.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!repoUrl.includes('github.com')) {
      return Response.json(
        { error: 'Only GitHub repositories are supported' },
        { status: 400 }
      );
    }

    console.log('Parsing repository structure for:', repoUrl);

    const githubService = new GitHubService();
    
    // Fetch repository data
    const repoData = await githubService.parseRepository(repoUrl);
    
    // Build folder structure programmatically (no AI needed)
    const folderStructure = githubService.buildFolderStructure(repoData);
    
    const result = {
      parsedStructure: folderStructure,
      metadata: {
        totalFiles: repoData.files.length,
        parsedAt: new Date().toISOString(),
        repoUrl,
      }
    };

    return Response.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('Error parsing repository:', error);
    return Response.json(
      { 
        error: 'Failed to parse repository',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}