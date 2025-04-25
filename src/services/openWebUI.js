const axios = require('axios');
const NodeCache = require('node-cache');

// Simple cache for model information
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

// Rate limiting setup
const rateLimitPerMinute = process.env.RATE_LIMIT || 10;
let requestCount = 0;
let lastResetTime = Date.now();

function resetRequestCount() {
  const now = Date.now();
  if (now - lastResetTime >= 60000) {  // 1 minute in milliseconds
    requestCount = 0;
    lastResetTime = now;
  }
}

function checkRateLimit() {
  resetRequestCount();
  if (requestCount >= rateLimitPerMinute) {
    throw new Error(`Rate limit exceeded. Maximum ${rateLimitPerMinute} requests per minute.`);
  }
  requestCount++;
}

// Log configuration on startup
console.log(`OpenWebUI service configured with URL: ${process.env.OPEN_WEBUI_URL}`);
console.log(`Authentication: Using API Key ${process.env.OPEN_WEBUI_API_KEY ? '(configured)' : '(missing)'}`);

// Helper function to extract content from response
function extractContent(response) {
  try {
    const data = response.data;
    
    // Handle OpenAI-style response format (standard for chat/completions endpoint)
    if (data.choices && data.choices.length > 0) {
      const responseContent = data.choices[0].message?.content || 
                           data.choices[0].text || 
                           JSON.stringify(data.choices[0]);
      
      return {
        content: responseContent,
        model: data.model || 'Unknown model',
        raw: data
      };
    }
    
    // Generic fallback for text response
    if (typeof data === 'string') {
      return {
        content: data,
        model: 'Unknown model',
        raw: data
      };
    }
    
    // Fallback for other JSON formats
    if (data.text || data.content || data.message || data.response || data.output || data.generated_text) {
      return {
        content: data.text || data.content || data.message || data.response || data.output || data.generated_text,
        model: data.model || 'Unknown model',
        raw: data
      };
    }
    
    // JSON fallback (last resort)
    return {
      content: JSON.stringify(data, null, 2),
      model: data.model || 'Unknown model',
      raw: data
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    return { 
      content: 'Error extracting response content',
      model: 'Unknown model',
      raw: response.data
    };
  }
}

// Function to send a message to OpenWebUI
async function sendMessage(text, model = null) {
  try {
    // Apply rate limiting
    checkRateLimit();
    
    // If no model specified, use the one from environment variables or default to gpt-4o
    const modelToUse = model || process.env.OPEN_WEBUI_DEFAULT_MODEL || 'gpt-4o';
    
    console.log(`Using model: ${modelToUse}`);
    
    // Create payload exactly matching our successful test script
    const payload = {
      model: modelToUse,
      messages: [
        {
          role: 'user',
          content: text
        }
      ]
    };
    
    // Headers for API request
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.OPEN_WEBUI_API_KEY}`
    };
    
    console.log(`Sending request to: ${process.env.OPEN_WEBUI_URL}/api/chat/completions`);
    console.log(`Model: ${modelToUse}`);
    
    // Make the request with explicit headers
    const response = await axios.post(
      `${process.env.OPEN_WEBUI_URL}/api/chat/completions`, 
      payload, 
      { 
        headers,
        timeout: 30000 // 30 second timeout
      }
    );
    
    // Check if the response is HTML instead of JSON
    const isHtmlResponse = 
      typeof response.data === 'string' && 
      (response.data.includes('<!doctype html>') || 
       response.data.includes('<html') || 
       response.data.includes('</html>'));
    
    if (isHtmlResponse) {
      console.log('Received HTML response instead of JSON');
      throw new Error('Received HTML response instead of API data');
    }
    
    console.log('API request successful');
    
    return extractContent(response);
  } catch (error) {
    console.error('Error sending message:', error.message);
    console.log('Response status:', error.response?.status);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please check your API key.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Please check the URL configuration.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

// Function to get a list of available models
async function getModels() {
  const cacheKey = 'available-models';
  
  // Check cache first
  const cachedModels = cache.get(cacheKey);
  if (cachedModels) {
    return cachedModels;
  }
  
  // Apply rate limiting
  checkRateLimit();
  
  try {
    console.log('Fetching models from OpenWebUI');
    
    // Headers for API request
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.OPEN_WEBUI_API_KEY}`
    };
    
    // Use the documented endpoint
    const response = await axios.get(`${process.env.OPEN_WEBUI_URL}/api/models`, { headers });
    
    console.log(`Models request successful: Status ${response.status}`);
    
    // Process response based on known formats
    let models = [];
    
    if (Array.isArray(response.data)) {
      models = response.data;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      models = response.data.data;
    } else if (response.data.models && Array.isArray(response.data.models)) {
      models = response.data.models;
    }
    
    console.log(`Found ${models.length} models`);
    cache.set(cacheKey, models);
    return models;
  } catch (error) {
    console.error('Error fetching models:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    throw new Error(`Failed to fetch models: ${error.message}`);
  }
}

// Get basic system status from OpenWebUI
async function getSystemStatus() {
  try {
    const response = await axios.get(`${process.env.OPEN_WEBUI_URL}/api/health`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    return {
      status: response.status >= 200 && response.status < 300 ? 'online' : 'error',
      statusCode: response.status,
      serverInfo: response.headers.server || 'Unknown'
    };
  } catch (error) {
    return {
      status: 'offline',
      error: error.message
    };
  }
}

module.exports = {
  getModels,
  sendMessage,
  getSystemStatus
}; 