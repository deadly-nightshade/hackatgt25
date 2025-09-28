"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubRepoAnalyzer = void 0;
const rest_1 = require("@octokit/rest");
class GitHubRepoAnalyzer {
    constructor(token) {
        this.octokit = new rest_1.Octokit({
            auth: token,
        });
    }
    /**
     * Parse GitHub URL to extract owner and repo
     */
    parseGitHubUrl(url) {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            throw new Error('Invalid GitHub URL format');
        }
        let repo = match[2];
        // Remove .git suffix if present
        if (repo.endsWith('.git')) {
            repo = repo.slice(0, -4);
        }
        return {
            owner: match[1],
            repo: repo,
        };
    }
    /**
     * Check if a file is a text/code file based on its extension
     */
    isCodeFile(filename) {
        const codeExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.sass', '.less', '.xml', '.json',
            '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.md', '.txt',
            '.sh', '.bat', '.ps1', '.sql', '.r', '.m', '.pl', '.lua', '.vim',
            '.dockerfile', '.gitignore', '.gitattributes', '.editorconfig',
            '.eslintrc', '.prettierrc', '.babelrc', '.tsconfig', '.package',
        ];
        const ext = filename.toLowerCase();
        return codeExtensions.some(extension => ext.endsWith(extension) || ext.includes(extension));
    }
    /**
     * Fetch file content from GitHub
     */
    async getFileContent(owner, repo, path, branch = 'main') {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref: branch,
            });
            if ('content' in response.data && response.data.content) {
                return {
                    content: Buffer.from(response.data.content, 'base64').toString('utf-8'),
                    encoding: response.data.encoding || 'utf-8',
                };
            }
        }
        catch (error) {
            console.warn(`Failed to fetch content for ${path}:`, error.message);
        }
        return null;
    }
    /**
     * Recursively build the file tree structure
     */
    async buildFileTree(owner, repo, path = '', branch = 'main') {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref: branch,
            });
            if (!Array.isArray(response.data)) {
                // Single file
                const file = response.data;
                const node = {
                    name: file.name,
                    path: file.path,
                    type: 'file',
                    size: file.size,
                };
                // Fetch content for code files
                if (this.isCodeFile(file.name) && file.size && file.size < 1048576) { // Skip files larger than 1MB
                    const content = await this.getFileContent(owner, repo, file.path, branch);
                    if (content) {
                        node.content = content.content;
                        node.encoding = content.encoding;
                    }
                }
                return [node];
            }
            // Directory with multiple items
            const nodes = [];
            for (const item of response.data) {
                const node = {
                    name: item.name,
                    path: item.path,
                    type: item.type === 'dir' ? 'dir' : 'file',
                    size: item.size,
                };
                if (item.type === 'dir') {
                    // Recursively get directory contents
                    node.children = await this.buildFileTree(owner, repo, item.path, branch);
                }
                else if (item.type === 'file') {
                    // Fetch content for code files
                    if (this.isCodeFile(item.name) && item.size && item.size < 1048576) { // Skip files larger than 1MB
                        const content = await this.getFileContent(owner, repo, item.path, branch);
                        if (content) {
                            node.content = content.content;
                            node.encoding = content.encoding;
                        }
                    }
                }
                nodes.push(node);
            }
            return nodes;
        }
        catch (error) {
            console.error(`Error fetching contents for path ${path}:`, error.message);
            return [];
        }
    }
    /**
     * Get the default branch of the repository
     */
    async getDefaultBranch(owner, repo) {
        try {
            const response = await this.octokit.rest.repos.get({
                owner,
                repo,
            });
            return response.data.default_branch;
        }
        catch (error) {
            console.warn('Could not fetch default branch, using "main"');
            return 'main';
        }
    }
    /**
     * Analyze a GitHub repository and return its structure with code content
     */
    async analyzeRepository(repoUrl, branch) {
        console.log(`Analyzing repository: ${repoUrl}`);
        const { owner, repo } = this.parseGitHubUrl(repoUrl);
        console.log(`Owner: ${owner}, Repo: ${repo}`);
        // Get default branch if not specified
        if (!branch) {
            branch = await this.getDefaultBranch(owner, repo);
        }
        console.log(`Using branch: ${branch}`);
        console.log('Fetching repository structure...');
        const structure = await this.buildFileTree(owner, repo, '', branch);
        const result = {
            owner,
            repo,
            branch,
            structure,
        };
        console.log('Analysis complete!');
        return result;
    }
}
exports.GitHubRepoAnalyzer = GitHubRepoAnalyzer;
