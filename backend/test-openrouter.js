/**
 * Standalone test script for OpenRouter API
 * Tests the API independently from chat history and database logic
 */
require('dotenv').config();

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openrouter/free';
const OPENROUTER_TIMEOUT_MS = 60000;

async function testOpenRouterAPI() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  console.log('\n=== OpenRouter API Test ===');
  console.log('[Test] API Key check:', apiKey ? 'Key found' : 'No key found');
  console.log('[Test] Key length:', apiKey ? apiKey.length : 0);
  
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    console.error('[Test] ERROR: OPENROUTER_API_KEY not set in .env file');
    console.error('[Test] Please add your OpenRouter API key to backend/.env file');
    process.exit(1);
  }

  const messages = [
    { role: 'user', content: 'Explain what React.js is in two sentences.' }
  ];

  const requestBody = {
    model: OPENROUTER_MODEL,
    messages
  };

  console.log('\n=== Sending Test Request ===');
  console.log('[Test] Model:', OPENROUTER_MODEL);
  console.log('[Test] Question:', messages[0].content);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  try {
    console.log('[Test] Starting request at', new Date().toISOString());
    const startTime = Date.now();
    
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://careerbot-ai.vercel.app',
        'X-OpenRouter-Title': 'CareerPulse AI Career Assistant'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timer);

    const duration = Date.now() - startTime;
    console.log(`\n=== Response ===`);
    console.log(`[Test] HTTP Status: ${response.status} ${response.statusText}`);
    console.log(`[Test] Response time: ${duration}ms`);

    const data = await response.json();

    if (response.ok) {
      const text = data.choices?.[0]?.message?.content;
      const modelUsed = data.model || OPENROUTER_MODEL;
      console.log(`[Test] Model used: ${modelUsed}`);
      console.log(`[Test] AI Response: ${text}`);
      console.log('\n=== Test Successful ===');
    } else {
      console.error('[Test] ERROR: API returned error');
      console.error('[Test] Error details:', data.error);
      process.exit(1);
    }
  } catch (err) {
    clearTimeout(timer);
    console.error('\n=== Test Failed ===');
    console.error('[Test] Error type:', err.constructor.name);
    console.error('[Test] Error message:', err.message);
    process.exit(1);
  }
}

testOpenRouterAPI();
