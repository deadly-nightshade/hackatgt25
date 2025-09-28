// Simple test for the workflow
const { testWorkflow } = require('./src/mastra/workflows/test-simple-workflow.ts');

async function quickTest() {
    console.log("🧪 Testing simple workflow...");
    
    try {
        const result = await testWorkflow.execute({
            repoUrl: 'https://github.com/octocat/Hello-World'
        });
        
        console.log("✅ Test successful!");
        console.log("Repository Name:", result.repositoryName);
        console.log("Description:", result.repositoryDescription);
        console.log("Summary length:", result.summary.length);
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        console.error("Full error:", error);
    }
}

quickTest();