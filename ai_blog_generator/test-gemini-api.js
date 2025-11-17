/**
 * Test Script for Gemini API Blog Generation
 * 
 * This script tests the complete blog generation flow:
 * 1. Validates Gemini API connection
 * 2. Generates a test blog post
 * 3. Verifies the post was created
 * 4. Cleans up the test post
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const TEST_POST_TITLE = 'Getting Started with Chess.js Library - A Complete Guide';
const TEST_POST_CONFIG = {
    titles: [TEST_POST_TITLE],
    tone: 'technical',
    length: 'short',
    tags: ['javascript', 'chess', 'library', 'tutorial'],
    author: 'Test Author',
    publish: false
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

async function testHealthCheck() {
    log('\n📋 Step 1: Testing API Health Check...', 'cyan');
    try {
        const response = await makeRequest(`${API_BASE_URL}/api/health`);
        if (response.status === 200) {
            log('✅ API is healthy and running', 'green');
            return true;
        } else {
            log(`❌ API health check failed with status ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Failed to connect to API: ${error.message}`, 'red');
        return false;
    }
}

async function testBlogGeneration() {
    log('\n📝 Step 2: Generating test blog post with Gemini API...', 'cyan');
    log(`   Title: "${TEST_POST_TITLE}"`, 'blue');
    log(`   Tone: ${TEST_POST_CONFIG.tone}`, 'blue');
    log(`   Length: ${TEST_POST_CONFIG.length}`, 'blue');
    log(`   Tags: ${TEST_POST_CONFIG.tags.join(', ')}`, 'blue');

    try {
        const response = await makeRequest(`${API_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(TEST_POST_CONFIG)
        });

        if (response.status === 200 && response.data.success) {
            const post = response.data.posts[0];
            log('✅ Blog post generated successfully!', 'green');
            log(`   Slug: ${post.slug}`, 'blue');
            log(`   Status: ${post.status}`, 'blue');
            return post.slug;
        } else {
            log(`❌ Blog generation failed`, 'red');
            log(`   Status: ${response.status}`, 'red');
            log(`   Error: ${JSON.stringify(response.data, null, 2)}`, 'red');
            return null;
        }
    } catch (error) {
        log(`❌ Failed to generate blog: ${error.message}`, 'red');
        return null;
    }
}

async function verifyPostExists(slug) {
    log('\n🔍 Step 3: Verifying post was created...', 'cyan');
    try {
        const contentPath = path.join(__dirname, 'content', `${slug}.md`);

        if (fs.existsSync(contentPath)) {
            const content = fs.readFileSync(contentPath, 'utf-8');
            const lines = content.split('\n');
            const contentLength = content.length;

            log('✅ Post file exists in content directory', 'green');
            log(`   Path: ${contentPath}`, 'blue');
            log(`   Size: ${contentLength} characters`, 'blue');
            log(`   Lines: ${lines.length}`, 'blue');

            // Check if it has frontmatter
            if (content.startsWith('---')) {
                log('✅ Post has valid frontmatter', 'green');
            }

            // Check if it has content
            if (contentLength > 500) {
                log('✅ Post has substantial content', 'green');
            }

            return true;
        } else {
            log('❌ Post file not found', 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Failed to verify post: ${error.message}`, 'red');
        return false;
    }
}

async function testPostAPI(slug) {
    log('\n🌐 Step 4: Testing post API endpoint...', 'cyan');
    try {
        const response = await makeRequest(`${API_BASE_URL}/api/posts`);

        if (response.status === 200 && response.data.success) {
            const posts = response.data.posts;
            const testPost = posts.find(p => p.slug === slug);

            if (testPost) {
                log('✅ Post appears in API response', 'green');
                log(`   Title: ${testPost.title}`, 'blue');
                log(`   Published: ${testPost.published}`, 'blue');
                log(`   Tags: ${testPost.tags?.join(', ') || 'none'}`, 'blue');
                return true;
            } else {
                log('❌ Post not found in API response', 'red');
                return false;
            }
        } else {
            log(`❌ Failed to fetch posts from API`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Failed to test post API: ${error.message}`, 'red');
        return false;
    }
}

async function cleanupTestPost(slug) {
    log('\n🧹 Step 5: Cleaning up test post...', 'cyan');
    try {
        const contentPath = path.join(__dirname, 'content', `${slug}.md`);

        if (fs.existsSync(contentPath)) {
            fs.unlinkSync(contentPath);
            log('✅ Test post deleted successfully', 'green');
            return true;
        } else {
            log('⚠️  Test post file not found (may have been deleted already)', 'yellow');
            return true;
        }
    } catch (error) {
        log(`❌ Failed to cleanup test post: ${error.message}`, 'red');
        return false;
    }
}

async function runTests() {
    log('\n' + '='.repeat(60), 'cyan');
    log('🧪 GEMINI API BLOG GENERATION TEST SUITE', 'cyan');
    log('='.repeat(60), 'cyan');

    let testsPassed = 0;
    let testsFailed = 0;
    let generatedSlug = null;

    // Test 1: Health Check
    if (await testHealthCheck()) {
        testsPassed++;
    } else {
        testsFailed++;
        log('\n❌ Cannot proceed without healthy API', 'red');
        return;
    }

    // Test 2: Blog Generation
    generatedSlug = await testBlogGeneration();
    if (generatedSlug) {
        testsPassed++;
    } else {
        testsFailed++;
        log('\n❌ Cannot proceed without generated post', 'red');
        return;
    }

    // Test 3: Verify Post Exists
    if (await verifyPostExists(generatedSlug)) {
        testsPassed++;
    } else {
        testsFailed++;
    }

    // Test 4: Test Post API
    if (await testPostAPI(generatedSlug)) {
        testsPassed++;
    } else {
        testsFailed++;
    }

    // Test 5: Cleanup
    if (await cleanupTestPost(generatedSlug)) {
        testsPassed++;
    } else {
        testsFailed++;
    }

    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`✅ Tests Passed: ${testsPassed}`, 'green');
    log(`❌ Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
    log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`, 'cyan');

    if (testsFailed === 0) {
        log('\n🎉 ALL TESTS PASSED! Gemini API integration is working correctly!', 'green');
        log('✅ You can now create blog posts using the web interface at:', 'green');
        log(`   ${API_BASE_URL}/manage/create`, 'blue');
    } else {
        log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
    }

    log('\n' + '='.repeat(60) + '\n', 'cyan');
}

// Run the tests
runTests().catch(error => {
    log(`\n❌ Test suite failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
