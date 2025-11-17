/**
 * Test Gemini API - List Available Models
 * This will help us understand what models are available with your API key
 */

const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';

console.log('\n🔍 Checking Gemini API Configuration...\n');
console.log(`Project: Generative Language Client`);
console.log(`Project ID: gen-lang-client-0161724905`);
console.log(`Project Number: 527095045699`);
console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 5)}\n`);

// Test 1: List available models
console.log('📋 Test 1: Listing available models...\n');

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${API_KEY}`,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

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
                console.log('✅ API Key is Valid!\n');

                if (response.models && response.models.length > 0) {
                    console.log(`📚 Available Models (${response.models.length} found):\n`);

                    response.models.forEach((model, index) => {
                        console.log(`${index + 1}. ${model.name}`);
                        if (model.displayName) {
                            console.log(`   Display Name: ${model.displayName}`);
                        }
                        if (model.description) {
                            console.log(`   Description: ${model.description.substring(0, 80)}...`);
                        }
                        if (model.supportedGenerationMethods) {
                            console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
                        }
                        console.log('');
                    });

                    // Find models that support generateContent
                    const contentModels = response.models.filter(m =>
                        m.supportedGenerationMethods &&
                        m.supportedGenerationMethods.includes('generateContent')
                    );

                    if (contentModels.length > 0) {
                        console.log('✅ Models that support content generation:\n');
                        contentModels.forEach(model => {
                            const modelName = model.name.replace('models/', '');
                            console.log(`   - ${modelName}`);
                        });
                        console.log('');

                        // Test with the first available model
                        const testModel = contentModels[0].name.replace('models/', '');
                        console.log(`🧪 Test 2: Testing content generation with ${testModel}...\n`);
                        testContentGeneration(testModel);
                    } else {
                        console.log('⚠️  No models support content generation');
                        console.log('   This might mean the API is not fully enabled.\n');
                        printNextSteps();
                    }
                } else {
                    console.log('⚠️  No models found');
                    console.log('   The API might not be enabled for your project.\n');
                    printNextSteps();
                }
            } else if (res.statusCode === 403) {
                console.log('❌ API Access Forbidden\n');
                console.log('Response:', JSON.stringify(response, null, 2));
                console.log('\n💡 This usually means:');
                console.log('   1. The Generative Language API is not enabled');
                console.log('   2. The API key doesn\'t have the right permissions\n');
                printNextSteps();
            } else if (res.statusCode === 400) {
                console.log('❌ Bad Request\n');
                console.log('Response:', JSON.stringify(response, null, 2));
                console.log('\n💡 The API key might be invalid or malformed.\n');
                printNextSteps();
            } else {
                console.log('❌ Request Failed\n');
                console.log('Response:', JSON.stringify(response, null, 2));
                console.log('');
                printNextSteps();
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

req.end();

function testContentGeneration(modelName) {
    const requestBody = JSON.stringify({
        contents: [{
            parts: [{
                text: 'Say "Hello from Gemini!" in one sentence.'
            }]
        }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

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
                    console.log('✅ Content Generation Works!\n');

                    if (response.candidates && response.candidates[0]) {
                        const text = response.candidates[0].content.parts[0].text;
                        console.log('📝 Generated Response:');
                        console.log(`   "${text}"\n`);
                    }

                    console.log('🎉 SUCCESS! Your Gemini API is fully functional!\n');
                    console.log('📝 Update your .env file with this model:');
                    console.log(`   GEMINI_MODEL=${modelName}\n`);
                    console.log('✅ Then restart your dev server and try creating a blog post!\n');
                } else {
                    console.log('❌ Content Generation Failed\n');
                    console.log('Response:', JSON.stringify(response, null, 2));
                    console.log('');
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
}

function printNextSteps() {
    console.log('📋 Next Steps:\n');
    console.log('1. Go to Google Cloud Console:');
    console.log('   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=gen-lang-client-0161724905\n');
    console.log('2. Make sure "Generative Language API" is ENABLED\n');
    console.log('3. Check API key restrictions:');
    console.log('   https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0161724905\n');
    console.log('4. If needed, create a new API key with no restrictions\n');
    console.log('5. Update your .env file with the new key\n');
    console.log('6. Restart the dev server\n');
}
