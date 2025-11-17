/**
 * Script to generate 10 programming blog articles
 * 
 * Usage: node generate-articles.js
 */

const titles = [
    "Understanding TypeScript Generics and Advanced Types",
    "Building RESTful APIs with Node.js and Express Best Practices",
    "React Hooks Deep Dive: useState, useEffect, and Custom Hooks",
    "Docker Containerization for Modern Web Applications",
    "Git Workflow Strategies for Team Collaboration",
    "Database Design Principles: SQL vs NoSQL",
    "Testing Strategies: Unit, Integration, and E2E Testing",
    "Web Performance Optimization Techniques",
    "Authentication and Authorization in Modern Web Apps",
    "CI/CD Pipeline Setup with GitHub Actions"
];

async function generateArticles() {
    console.log('🚀 Starting article generation...\n');
    console.log(`📝 Generating ${titles.length} articles\n`);

    const requestBody = {
        titles: titles,
        tone: 'technical',
        length: 'medium',
        autoGenerateTags: true,
        publish: false
    };

    try {
        const response = await fetch('http://localhost:3000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            process.exit(1);
        }

        const result = await response.json();

        console.log('\n✅ Generation Complete!\n');
        console.log(`Success: ${result.posts.filter(p => p.status === 'success').length}/${titles.length}`);
        console.log(`Failed: ${result.posts.filter(p => p.status === 'error').length}/${titles.length}\n`);

        console.log('📊 Results:\n');
        result.posts.forEach((post, index) => {
            const icon = post.status === 'success' ? '✅' : '❌';
            console.log(`${icon} ${index + 1}. ${post.title}`);
            if (post.status === 'success') {
                console.log(`   Slug: ${post.slug}`);
            } else {
                console.log(`   Error: ${post.error}`);
            }
            console.log('');
        });

        if (result.posts.some(p => p.status === 'error')) {
            console.log('⚠️  Some articles failed to generate. Check errors above.');
            process.exit(1);
        }

        console.log('🎉 All articles generated successfully!');
        console.log('📁 Articles saved to: ai_blog_generator/content/');
        console.log('\n💡 Next steps:');
        console.log('   1. Review generated articles in content/ directory');
        console.log('   2. Start dev server: npm run dev');
        console.log('   3. View articles at: http://localhost:3000/blog');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Make sure the dev server is running:');
        console.error('   npm run dev');
        process.exit(1);
    }
}

// Check if dev server is running
async function checkServer() {
    try {
        const response = await fetch('http://localhost:3000/api/health');
        if (response.ok) {
            return true;
        }
    } catch (error) {
        return false;
    }
    return false;
}

async function main() {
    console.log('🔍 Checking if dev server is running...\n');

    const serverRunning = await checkServer();

    if (!serverRunning) {
        console.error('❌ Dev server is not running!');
        console.error('\n💡 Please start the dev server first:');
        console.error('   cd ai_blog_generator');
        console.error('   npm run dev');
        console.error('\nThen run this script again.');
        process.exit(1);
    }

    console.log('✅ Dev server is running\n');
    await generateArticles();
}

main();
