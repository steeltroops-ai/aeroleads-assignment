/**
 * Simple Test for Gemini API Blog Generation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
    titles: ['Getting Started with Chess.js Library'],
    tone: 'technical',
    length: 'short',
    tags: ['javascript', 'chess', 'library'],
    author: 'Test Author',
    publish: false
};

console.log('\n🧪 Testing Gemini API Blog Generation...\n');
console.log('Configuration:');
console.log(`  Title: ${TEST_CONFIG.titles[0]}`);
console.log(`  Tone: ${TEST_CONFIG.tone}`);
console.log(`  Length: ${TEST_CONFIG.length}`);
console.log('\n⏳ Generating blog post (this may take 10-30 seconds)...\n');

const postData = JSON.stringify(TEST_CONFIG);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);

            console.log(`📊 Response Status: ${res.statusCode}\n`);

            if (res.statusCode === 200 && response.success) {
                const post = response.posts[0];
                console.log('✅ SUCCESS! Blog post generated!\n');
                console.log(`   Slug: ${post.slug}`);
                console.log(`   Status: ${post.status}`);
                console.log(`   Message: ${response.message}\n`);

                // Check if file exists
                const filePath = path.join(__dirname, 'content', `${post.slug}.md`);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    console.log(`✅ File created: ${filePath}`);
                    console.log(`   Size: ${content.length} characters`);
                    console.log(`   Lines: ${content.split('\n').length}\n`);

                    // Show preview
                    const lines = content.split('\n');
                    console.log('📄 Content Preview (first 15 lines):');
                    console.log('─'.repeat(60));
                    console.log(lines.slice(0, 15).join('\n'));
                    console.log('─'.repeat(60));

                    console.log('\n🎉 Test completed successfully!');
                    console.log(`\n📝 View the post at: http://localhost:3000/blog/${post.slug}`);
                    console.log(`✏️  Edit the post at: http://localhost:3000/manage/edit/${post.slug}`);

                    // Cleanup
                    console.log('\n🧹 Cleaning up test post...');
                    fs.unlinkSync(filePath);
                    console.log('✅ Test post deleted\n');
                } else {
                    console.log('⚠️  Warning: File not found at expected location\n');
                }
            } else if (res.statusCode === 401) {
                console.log('❌ AUTHENTICATION FAILED\n');
                console.log('   The Gemini API key is invalid or not configured correctly.');
                console.log('   Please check your .env file:\n');
                console.log('   1. Ensure LLM_PROVIDER=gemini');
                console.log('   2. Ensure GEMINI_API_KEY is set correctly');
                console.log('   3. Restart the dev server after changes\n');
            } else {
                console.log('❌ FAILED\n');
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Response: ${JSON.stringify(response, null, 2)}\n`);
            }
        } catch (error) {
            console.log('❌ ERROR parsing response\n');
            console.log(`   ${error.message}`);
            console.log(`   Raw response: ${data}\n`);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ REQUEST FAILED\n');
    console.log(`   ${error.message}\n`);
    console.log('   Make sure the dev server is running on http://localhost:3000\n');
});

req.write(postData);
req.end();
