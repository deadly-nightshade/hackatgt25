// Test script for the new analyzing-files workflow
const { analyzingFilesWorkflow } = require('./src/mastra/workflows/analyzing-files-workflow.ts');

async function testAnalyzingFilesWorkflow() {
    try {
        console.log('🚀 Testing new analyzing-files workflow...');
        
        // Test with a simple, well-structured repository
        const testUrl = 'https://github.com/octocat/Hello-World';
        
        console.log(`📥 Testing repository: ${testUrl}`);
        
        const result = await analyzingFilesWorkflow.execute({
            repoUrl: testUrl
        });
        
        console.log('✅ Workflow completed successfully!');
        console.log(`📊 Results:`);
        console.log(`- Repository analyzed: ${result.filesData.length} files`);
        console.log(`- Detailed analysis: ${result.analyzedFiles.length} files`);
        
        // Count total structural elements
        let totalClasses = 0;
        let totalFunctions = 0;
        let totalInterfaces = 0;
        let totalDesignPatterns = 0;
        
        result.analyzedFiles.forEach(file => {
            totalClasses += file.classes.length;
            totalFunctions += file.functions.length;
            totalInterfaces += file.interfaces.length;
            totalDesignPatterns += file.designPatterns.length;
        });
        
        console.log(`- Total classes found: ${totalClasses}`);
        console.log(`- Total functions found: ${totalFunctions}`);
        console.log(`- Total interfaces found: ${totalInterfaces}`);
        console.log(`- Design patterns identified: ${totalDesignPatterns}`);
        
        console.log('\n📁 Files analyzed:');
        result.analyzedFiles.forEach((file, index) => {
            console.log(`  ${index}: ${file.filePath}`);
            console.log(`     Purpose: ${file.purpose.substring(0, 80)}${file.purpose.length > 80 ? '...' : ''}`);
            if (file.classes.length > 0) {
                console.log(`     Classes: ${file.classes.map(c => c.name).join(', ')}`);
            }
            if (file.functions.length > 0) {
                console.log(`     Functions: ${file.functions.map(f => f.name).join(', ')}`);
            }
            if (file.designPatterns.length > 0) {
                console.log(`     Patterns: ${file.designPatterns.join(', ')}`);
            }
            console.log('');
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Workflow failed:', error);
        throw error;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testAnalyzingFilesWorkflow()
        .then(() => {
            console.log('🎉 Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testAnalyzingFilesWorkflow };