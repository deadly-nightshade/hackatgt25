// Simple test to verify the updated workflow works
const { sequentialPipeline } = require('./src/mastra/workflows/test-workflow.ts');

async function testWorkflow() {
    try {
        console.log('🚀 Testing updated workflow with real repository fetching...');
        
        // Test with a simple, small repository
        const testUrl = 'https://github.com/octocat/Hello-World';
        
        console.log(`📥 Testing repository: ${testUrl}`);
        
        const result = await sequentialPipeline.execute({
            repoUrl: testUrl
        });
        
        console.log('✅ Workflow completed successfully!');
        console.log(`📊 Results:`);
        console.log(`- Repository analyzed`);
        console.log(`- Files found: ${result.filesData.length}`);
        console.log(`- Abstractions identified: ${result.abstractionsList.length}`);
        console.log(`- Relationships analyzed: ${result.relationships.length}`);
        console.log(`- Chapters generated: ${result.chapters.length}`);
        
        console.log('\n📁 Files analyzed:');
        result.filesData.forEach(([path], index) => {
            console.log(`  ${index}: ${path}`);
        });
        
        console.log('\n🏗️ Abstractions found:');
        result.abstractionsList.forEach((abstraction, index) => {
            console.log(`  ${index}: ${abstraction}`);
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Workflow failed:', error);
        throw error;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testWorkflow()
        .then(() => {
            console.log('🎉 Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testWorkflow };