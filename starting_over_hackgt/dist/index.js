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
const dotenv = __importStar(require("dotenv"));
const github_analyzer_1 = require("./github-analyzer");
const gemini_analyzer_1 = require("./gemini-analyzer");
// Load environment variables
dotenv.config();
async function main() {
    // Repository URL - you can change this to any GitHub repository
    const repoUrl = process.env.REPO_URL || 'https://github.com/octocat/Hello-World';
    // Optional: Use GitHub token for higher rate limits
    const githubToken = process.env.GITHUB_TOKEN;
    // Gemini API key for AI analysis
    const geminiApiKey = process.env.GEMINI_API_KEY;
    try {
        console.log('=== STEP 1: ANALYZING GITHUB REPOSITORY ===');
        const analyzer = new github_analyzer_1.GitHubRepoAnalyzer(githubToken);
        const result = await analyzer.analyzeRepository(repoUrl);
        console.log('\n=== STEP 2: AI CODE ANALYSIS ===');
        if (geminiApiKey) {
            console.log(`Using Gemini API key: ${geminiApiKey.substring(0, 10)}...${geminiApiKey.substring(geminiApiKey.length - 5)}`);
            const aiAnalyzer = new gemini_analyzer_1.GeminiCodeAnalyzer(geminiApiKey);
            const aiAnalysis = await aiAnalyzer.analyzeCodeStructure(result.structure);
            // Add AI analysis to the result
            result.aiAnalysis = aiAnalysis;
            console.log('AI analysis completed!');
            console.log('\n=== STEP 3: AI ABSTRACTION ANALYSIS ===');
            console.log('Analyzing code abstractions...');
            const abstractionAnalysis = await aiAnalyzer.analyzeAbstractions(result.structure);
            // Add abstraction analysis to the result
            result.abstractionAnalysis = abstractionAnalysis;
            console.log('Abstraction analysis completed!');
            console.log(`Found ${abstractionAnalysis.abstractions.length} abstractions:`);
            abstractionAnalysis.abstractions.forEach((abstraction, index) => {
                console.log(`${index + 1}. ${abstraction.name} (${abstraction.category}): ${abstraction.description}`);
            });
            console.log('\n=== STEP 4: AI RELATIONSHIP ANALYSIS ===');
            console.log('Analyzing relationships between abstractions...');
            const relationshipAnalysis = await aiAnalyzer.analyzeRelationships(abstractionAnalysis, result.structure);
            // Add relationship analysis to the result
            result.relationshipAnalysis = relationshipAnalysis;
            console.log('Relationship analysis completed!');
            console.log(`Project summary: ${relationshipAnalysis.summary}`);
            console.log(`Found ${relationshipAnalysis.relationships.length} relationships:`);
            relationshipAnalysis.relationships.forEach((relationship, index) => {
                const fromName = abstractionAnalysis.abstractions[relationship.from]?.name || `Unknown(${relationship.from})`;
                const toName = abstractionAnalysis.abstractions[relationship.to]?.name || `Unknown(${relationship.to})`;
                console.log(`${index + 1}. ${fromName} --[${relationship.label}]--> ${toName}`);
            });
            console.log('\n=== STEP 5: AI CHAPTER ORDERING ===');
            console.log('Determining optimal order for presenting abstractions...');
            const chapterOrder = await aiAnalyzer.orderChapters(abstractionAnalysis, relationshipAnalysis, "Repository");
            // Add chapter order to the result
            result.chapterOrder = chapterOrder;
            console.log('Chapter ordering completed!');
            console.log(`Optimal chapter order (${chapterOrder.orderedIndices.length} chapters):`);
            chapterOrder.orderedIndices.forEach((index, position) => {
                const abstractionName = abstractionAnalysis.abstractions[index]?.name || `Unknown(${index})`;
                console.log(`${position + 1}. Chapter ${index}: ${abstractionName}`);
            });
            console.log('\n=== STEP 6: AI CHAPTER WRITING ===');
            console.log('Generating tutorial chapters with Markdown and Mermaid diagrams...');
            const chapters = await aiAnalyzer.writeChapters(abstractionAnalysis, chapterOrder, result.structure, "Repository");
            // Add chapters to the result
            result.chapters = chapters;
            console.log('Chapter writing completed!');
            console.log(`Generated ${chapters.chapters.length} tutorial chapters with Markdown content and Mermaid diagrams`);
            chapters.chapters.forEach((chapter, index) => {
                const lineCount = chapter.split('\n').length;
                const wordCount = chapter.split(/\s+/).length;
                console.log(`  Chapter ${index + 1}: ${lineCount} lines, ~${wordCount} words`);
            });
        }
        else {
            console.log('No GEMINI_API_KEY found, skipping AI analysis');
            console.log('Add your Gemini API key to .env file to enable AI analysis');
        }
        // Output the complete structure with AI analysis as JSON
        console.log('\n=== REPOSITORY ANALYSIS RESULT ===');
        console.log(JSON.stringify(result, null, 2));
        // Optional: Save to file
        const fs = require('fs');
        const outputPath = 'repository-analysis.json';
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\nResult also saved to: ${outputPath}`);
        // Save AI analysis separately for easier access
        if (result.aiAnalysis) {
            const aiOutputPath = 'ai-code-analysis.json';
            fs.writeFileSync(aiOutputPath, JSON.stringify(result.aiAnalysis, null, 2));
            console.log(`AI analysis also saved to: ${aiOutputPath}`);
        }
        // Save abstraction analysis separately for easier access
        if (result.abstractionAnalysis) {
            const abstractionOutputPath = 'abstraction-analysis.json';
            fs.writeFileSync(abstractionOutputPath, JSON.stringify(result.abstractionAnalysis, null, 2));
            console.log(`Abstraction analysis also saved to: ${abstractionOutputPath}`);
        }
        // Save relationship analysis separately for easier access
        if (result.relationshipAnalysis) {
            const relationshipOutputPath = 'relationship-analysis.json';
            fs.writeFileSync(relationshipOutputPath, JSON.stringify(result.relationshipAnalysis, null, 2));
            console.log(`Relationship analysis also saved to: ${relationshipOutputPath}`);
        }
        // Save chapter order separately for easier access
        if (result.chapterOrder) {
            const chapterOrderOutputPath = 'chapter-order.json';
            fs.writeFileSync(chapterOrderOutputPath, JSON.stringify(result.chapterOrder, null, 2));
            console.log(`Chapter order also saved to: ${chapterOrderOutputPath}`);
        }
        // Save chapters separately for easier access
        if (result.chapters) {
            const chaptersOutputPath = 'chapters.json';
            fs.writeFileSync(chaptersOutputPath, JSON.stringify(result.chapters, null, 2));
            console.log(`Chapters also saved to: ${chaptersOutputPath}`);
            // Save individual chapter files as Markdown
            if (result.chapters.chapters && Array.isArray(result.chapters.chapters)) {
                console.log('\nSaving individual chapter files:');
                result.chapters.chapters.forEach((chapterContent, index) => {
                    const chapterNum = index + 1;
                    const chapterFileName = `chapter_${chapterNum.toString().padStart(2, '0')}.md`;
                    fs.writeFileSync(chapterFileName, chapterContent);
                    console.log(`  Chapter ${chapterNum} saved to: ${chapterFileName}`);
                });
            }
        }
    }
    catch (error) {
        console.error('Error analyzing repository:', error);
        process.exit(1);
    }
}
// Run the script
if (require.main === module) {
    main();
}
