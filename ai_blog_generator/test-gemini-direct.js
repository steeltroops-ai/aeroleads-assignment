/**
 * Direct Gemini API Test
 * Tests the Gemini API key directly without going through the app
 */

const https = require('https');

const API_KEY = 'AIzaSyCi7YSbLlmWUTYAuTNhVOQGp_Ta9KEogXU';
const MODEL = 'gemini-pro'; // or try 'gemini-1.5-pro' or just 'gemini-pro'

console.log('\n🧪 Testing Gemini API Key Directly...\n');
console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 5)}`);
console.log(`Model: ${MODEL}\n`);

const requestBody = JSON.stringify({
    contents: [{
        parts: [{
            text: 'Say "Hello, World!" in one sentence.'
        }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1/models/${MODEL}:generateContent?key=${API_KEY}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
    }
};

console.log('⏳ Sending request to Gemini API...\n');

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`📊 Response Status: ${res.statusCode}\n`);

        try {
            const response = JSON.parse(data);

            if (res.statusCode === 200) {
                console.log('✅ SUCCESS! Gemini API is working!\n');

                if (response.candidates && response.candidates[0]) {
                    const text = response.candidates[0].content.parts[0].text;
                    console.log('📝 Response from Gemini:');
                    console.log(`   "${text}"\n`);
                }

                console.log('🎉 Your API key is valid and working correctly!');
                console.log('   The blog generator should work now.\n');
                console.log('💡 Next steps:');
                console.log('   1. Make sure the dev server is running');
                console.log('   2. Go to http://localhost:3000/manage/create');
                console.log('   3. Create a new blog post\n');
            } else {
                console.log('❌ API Request Failed\n');
                console.log('Response:');
                console.log(JSON.stringify(response, null, 2));
                console.log('\n');

                if (response.error) {
                    console.log('Error Details:');
                    console.log(`   Code: ${response.error.code}`);
                    console.log(`   Message: ${response.error.message}`);
                    console.log(`   Status: ${response.error.status}\n`);

                    if (response.error.status === 'INVALID_ARGUMENT') {
                        console.log('💡 The API key appears to be invalid or expired.');
                        console.log('   Please get a new API key from:');
                        console.log('   https://makersuite.google.com/app/apikey\n');
                    }
                }
            }
        } catch (error) {
            console.log('❌ Error parsing response\n');
            console.log(`   ${error.message}`);
            console.log(`\nRaw response:\n${data}\n`);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Request Failed\n');
    console.log(`   ${error.message}\n`);
});

req.write(requestBody);
req.end();
