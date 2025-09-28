#!/usr/bin/env node
// src/cli/github-analyzer-cli.ts

import { GitHubAnalyzer, analyzeGitHubRepository } from '../github-analyzer';
import { Command } from 'commander';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('github-analyzer')
  .description('Analyze GitHub repositories and extract file structure and content')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze a GitHub repository')
  .argument('<url>', 'GitHub repository URL')
  .option('-t, --token <token>', 'GitHub personal access token (or use GITHUB_TOKEN env var)')
  .option('-b, --branch <branch>', 'Branch to analyze (defaults to repository default branch)')
  .option('-o, --output <path>', 'Output file path for JSON results')
  .option('--no-save', 'Don\'t save results to file')
  .action(async (url: string, options: any) => {
    try {
      console.log('🔍 Starting GitHub repository analysis...\n');

      const analysisOptions = {
        token: options.token || process.env.GITHUB_TOKEN,
        branch: options.branch,
        saveToFile: options.save !== false,
        outputPath: options.output,
      };

      if (!analysisOptions.token) {
        console.warn('⚠️  No GitHub token provided. Rate limits may apply for public repositories.\n');
      }

      const analysis = await analyzeGitHubRepository(url, analysisOptions);

      console.log('\n✅ Analysis completed successfully!');
      console.log(`📊 Repository: ${analysis.repository.fullName}`);
      console.log(`📁 Total directories: ${analysis.totalDirectories}`);
      console.log(`📄 Total files: ${analysis.totalFiles}`);
      console.log(`📅 Analysis date: ${analysis.analysisDate}`);

      if (analysisOptions.saveToFile) {
        const fileName = analysisOptions.outputPath || 
          `${analysis.repository.owner}_${analysis.repository.name}_analysis.json`;
        console.log(`💾 Results saved to: ${fileName}`);
      }

      // Display file structure summary
      console.log('\n📋 File structure preview:');
      displayStructureSummary(analysis.fileStructure, 0, 3);

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate-token')
  .description('Validate GitHub token and show rate limit info')
  .option('-t, --token <token>', 'GitHub personal access token (or use GITHUB_TOKEN env var)')
  .action(async (options: any) => {
    try {
      const token = options.token || process.env.GITHUB_TOKEN;
      
      if (!token) {
        console.error('❌ No GitHub token provided');
        process.exit(1);
      }

      const analyzer = new GitHubAnalyzer(token);
      // Test the token by making a simple API call
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: token });
      
      const { data: user } = await octokit.rest.users.getAuthenticated();
      const { data: rateLimit } = await octokit.rest.rateLimit.get();

      console.log('✅ GitHub token is valid');
      console.log(`👤 Authenticated as: ${user.login}`);
      console.log(`⚡ Rate limit: ${rateLimit.rate.remaining}/${rateLimit.rate.limit}`);
      console.log(`🔄 Resets at: ${new Date(rateLimit.rate.reset * 1000).toLocaleString()}`);

    } catch (error) {
      console.error('❌ Token validation failed:', error);
      process.exit(1);
    }
  });

function displayStructureSummary(structures: any[], depth: number = 0, maxDepth: number = 3) {
  if (depth > maxDepth) return;

  for (const item of structures.slice(0, 10)) { // Show first 10 items
    const indent = '  '.repeat(depth);
    const icon = item.type === 'dir' ? '📁' : '📄';
    const sizeInfo = item.size ? ` (${formatBytes(item.size)})` : '';
    
    console.log(`${indent}${icon} ${item.name}${sizeInfo}`);

    if (item.children && depth < maxDepth) {
      displayStructureSummary(item.children, depth + 1, maxDepth);
    }
  }

  if (structures.length > 10) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}... and ${structures.length - 10} more items`);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

program.parse();