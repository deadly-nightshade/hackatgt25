"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubAnalyzer = void 0;
exports.analyzeGitHubRepository = analyzeGitHubRepository;
// src/github-analyzer.ts
const rest_1 = require("@octokit/rest");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class GitHubAnalyzer {
    constructor(token) {
        this.maxFileSize = 1024 * 1024; // 1MB limit for file content
        this.octokit = new rest_1.Octokit({
            auth: token || process.env.GITHUB_TOKEN,
        });
    }
    /**
     * Parse GitHub URL to extract owner and repo
     */
    parseGitHubUrl(url) {
        const urlPatterns = [
            /github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
            /github\.com\/([^\/]+)\/([^\/]+)$/
        ];
        const cleanUrl = url.replace(/^https?:\/\//, '');
        for (const pattern of urlPatterns) {
            const match = cleanUrl.match(pattern);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2].replace(/\.git$/, '')
                };
            }
        }
        throw new Error(`Invalid GitHub URL format: ${url}`);
    }
    /**
     * Fetch repository information
     */
    async getRepositoryInfo(owner, repo) {
        try {
            const { data } = await this.octokit.rest.repos.get({
                owner,
                repo,
            });
            return {
                owner: data.owner.login,
                name: data.name,
                fullName: data.full_name,
                url: data.html_url,
                defaultBranch: data.default_branch,
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch repository info: ${error}`);
        }
    }
    /**
     * Recursively fetch directory contents
     */
    async fetchDirectoryContents(owner, repo, path = "", branch = "main") {
        try {
            const { data } = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref: branch,
            });
            const contents = Array.isArray(data) ? data : [data];
            const structures = [];
            for (const item of contents) {
                const structure = {
                    name: item.name,
                    path: item.path,
                    type: item.type === 'dir' ? 'dir' : 'file',
                    size: item.size,
                };
                if (item.type === 'dir') {
                    // Recursively fetch subdirectory contents
                    structure.children = await this.fetchDirectoryContents(owner, repo, item.path, branch);
                }
                else if (item.type === 'file') {
                    // Fetch file content if it's not too large
                    if (item.size && item.size < this.maxFileSize) {
                        try {
                            const content = await this.fetchFileContent(owner, repo, item.path, branch);
                            structure.content = content.content;
                            structure.encoding = content.encoding;
                        }
                        catch (error) {
                            console.warn(`Failed to fetch content for ${item.path}:`, error);
                            structure.content = `[Error: Could not fetch file content - ${error}]`;
                        }
                    }
                    else {
                        structure.content = `[File too large: ${item.size} bytes]`;
                    }
                }
                structures.push(structure);
            }
            return structures;
        }
        catch (error) {
            throw new Error(`Failed to fetch directory contents for ${path}: ${error}`);
        }
    }
    /**
     * Fetch individual file content
     */
    async fetchFileContent(owner, repo, path, branch = "main") {
        try {
            const { data } = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref: branch,
            });
            if ('content' in data && data.content) {
                return {
                    content: data.encoding === 'base64'
                        ? Buffer.from(data.content, 'base64').toString('utf-8')
                        : data.content,
                    encoding: data.encoding || 'utf-8'
                };
            }
            throw new Error('File content not available');
        }
        catch (error) {
            throw new Error(`Failed to fetch file content: ${error}`);
        }
    }
    /**
     * Count files and directories in structure
     */
    countStructureItems(structures) {
        let files = 0;
        let directories = 0;
        for (const item of structures) {
            if (item.type === 'file') {
                files++;
            }
            else if (item.type === 'dir') {
                directories++;
                if (item.children) {
                    const childCounts = this.countStructureItems(item.children);
                    files += childCounts.files;
                    directories += childCounts.directories;
                }
            }
        }
        return { files, directories };
    }
    /**
     * Main method to analyze a GitHub repository
     */
    async analyzeRepository(url, branch) {
        console.log(`Starting analysis of repository: ${url}`);
        try {
            // Parse URL
            const { owner, repo } = this.parseGitHubUrl(url);
            console.log(`Parsed repository: ${owner}/${repo}`);
            // Get repository info
            const repoInfo = await this.getRepositoryInfo(owner, repo);
            const targetBranch = branch || repoInfo.defaultBranch;
            console.log(`Fetching file structure from branch: ${targetBranch}`);
            // Fetch file structure and content
            const fileStructure = await this.fetchDirectoryContents(owner, repo, "", targetBranch);
            // Count items
            const counts = this.countStructureItems(fileStructure);
            console.log(`Analysis complete: ${counts.files} files, ${counts.directories} directories`);
            return {
                repository: repoInfo,
                fileStructure,
                totalFiles: counts.files,
                totalDirectories: counts.directories,
                analysisDate: new Date().toISOString(),
            };
        }
        catch (error) {
            throw new Error(`Repository analysis failed: ${error}`);
        }
    }
    /**
     * Save analysis results to a JSON file
     */
    async saveAnalysisToFile(analysis, outputPath) {
        const fileName = outputPath || `${analysis.repository.owner}_${analysis.repository.name}_analysis.json`;
        const filePath = path.resolve(fileName);
        try {
            const jsonContent = JSON.stringify(analysis, null, 2);
            fs.writeFileSync(filePath, jsonContent, 'utf-8');
            console.log(`Analysis saved to: ${filePath}`);
            return filePath;
        }
        catch (error) {
            throw new Error(`Failed to save analysis: ${error}`);
        }
    }
}
exports.GitHubAnalyzer = GitHubAnalyzer;
/**
 * Utility function for quick repository analysis
 */
async function analyzeGitHubRepository(url, options = {}) {
    const analyzer = new GitHubAnalyzer(options.token);
    const analysis = await analyzer.analyzeRepository(url, options.branch);
    if (options.saveToFile) {
        await analyzer.saveAnalysisToFile(analysis, options.outputPath);
    }
    return analysis;
}
