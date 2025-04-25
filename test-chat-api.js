// Test script to directly test the chat completions API endpoint
require('dotenv').config();
const axios = require('axios');

// Get configuration from .env
const apiUrl = process.env.OPEN_WEBUI_URL;
const apiKey = process.env.OPEN_WEBUI_API_KEY;
const model = process.env.OPEN_WEBUI_DEFAULT_MODEL || 'gpt-4o';

console.log('Testing Chat Completions API');
console.log(`URL: ${apiUrl}/api/chat/completions`);
console.log(`Model: ${model}`);
console.log(`API Key (first 5 chars): ${apiKey ? apiKey.substring(0, 5) + '...' : 'Not provided'}`);

// Create the payload exactly as in documentation
const payload = {
  model: model,
  messages: [
    {
      role: 'user',
      content: 'Say hello in 5 words or less'
    }
  ]
};

// Make the API request
async function testChatAPI() {
  try {
    const response = await axios.post(`${apiUrl}/api/chat/completions`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers));
    
    if (response.data) {
      if (response.data.choices && response.data.choices.length > 0) {
        console.log('Success! Model response:');
        console.log(response.data.choices[0].message?.content || JSON.stringify(response.data.choices[0]));
      } else {
        console.log('Unexpected response format:');
        console.log(JSON.stringify(response.data).substring(0, 500));
      }
    } else {
      console.log('Empty response received');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers));
      console.error('Data:', error.response.data);
    }
  }
}

// Run the test
testChatAPI(); 