// src/examples/github-analyzer-example.ts

import { analyzeGitHubRepository, GitHubAnalyzer } from '../github-analyzer';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function exampleUsage() {
  try {
    // Example 1: Quick analysis with utility function
    console.log('=== Example 1: Quick Analysis ===');
    
    const analysis1 = await analyzeGitHubRepository(
      'https://github.com/octocat/Hello-World',
      {
        token: process.env.GITHUB_TOKEN, // Optional, but recommended to avoid rate limits
        saveToFile: true,
      }
    );

    console.log(`Repository: ${analysis1.repository.fullName}`);
    console.log(`Total files: ${analysis1.totalFiles}`);
    console.log(`Total directories: ${analysis1.totalDirectories}`);

    // Example 2: Using the class directly for more control
    console.log('\n=== Example 2: Using GitHubAnalyzer class ===');
    
    const analyzer = new GitHubAnalyzer(process.env.GITHUB_TOKEN);
    
    const analysis2 = await analyzer.analyzeRepository(
      'https://github.com/microsoft/TypeScript',
      'main' // specify branch
    );

    // Save to custom location
    await analyzer.saveAnalysisToFile(
      analysis2, 
      './typescript-analysis.json'
    );

    // Example 3: Processing the file structure
    console.log('\n=== Example 3: Processing File Structure ===');
    
    function findFilesByExtension(structures: any[], extension: string): any[] {
      const results: any[] = [];
      
      for (const item of structures) {
        if (item.type === 'file' && item.name.endsWith(extension)) {
          results.push(item);
        }
        if (item.children) {
          results.push(...findFilesByExtension(item.children, extension));
        }
      }
      
      return results;
    }

    const tsFiles = findFilesByExtension(analysis2.fileStructure, '.ts');
    console.log(`Found ${tsFiles.length} TypeScript files`);
    
    // Show first few TypeScript files
    tsFiles.slice(0, 5).forEach(file => {
      console.log(`- ${file.path} (${file.size} bytes)`);
      if (file.content) {
        const lines = file.content.split('\n').length;
        console.log(`  └─ ${lines} lines of code`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleUsage()
    .then(() => console.log('\n✅ Example completed'))
    .catch(console.error);
}

export { exampleUsage };