// Test the minimal workflow to isolate the API issue
const { minimalTestWorkflow } = require('./src/mastra/workflows/minimal-test-workflow.ts');

async function testMinimal() {
    console.log("🔬 Testing minimal workflow (no agents, no API calls)...");
    
    try {
        const result = await minimalTestWorkflow.execute({
            repoUrl: 'https://github.com/octocat/Hello-World'
        });
        
        console.log("✅ Minimal workflow test successful!");
        console.log("\n📊 Results:");
        console.log("- Repository Name:", result.repositoryName);
        console.log("- Description length:", result.repositoryDescription.length);
        console.log("- Summary length:", result.summary.length);
        
        console.log("\n🎉 Workflow structure is working correctly!");
        console.log("The issue is likely with the Google AI SDK or agent configuration.");
        
        return result;
        
    } catch (error) {
        console.error("❌ Even minimal test failed:", error.message);
        console.error("This indicates a deeper workflow/Mastra issue");
        throw error;
    }
}

testMinimal()
    .then(() => {
        console.log("Test completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Test failed:", error);
        process.exit(1);
    });