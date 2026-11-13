const { randomUUID } = require('node:crypto');
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache model information for 5 minutes.
const cache = new NodeCache({ stdTTL: 300 });

// Rate limiting applies to bot requests, including model-list requests.
const parsedRateLimit = Number.parseInt(process.env.RATE_LIMIT || '10', 10);
const rateLimitPerMinute =
  Number.isFinite(parsedRateLimit) && parsedRateLimit >= 0
    ? parsedRateLimit
    : 10;

let requestCount = 0;
let lastResetTime = Date.now();

const CHAT_TIMEOUT_MS = 5 * 60 * 1000;
const TASK_POLL_INTERVAL_MS = 1500;

function getBaseUrl() {
  const url = process.env.OPEN_WEBUI_URL;

  if (!url) {
    throw new Error('OPEN_WEBUI_URL is not configured.');
  }

  return url.replace(/\/+$/, '');
}

function getHeaders() {
  const apiKey = process.env.OPEN_WEBUI_API_KEY;

  if (!apiKey) {
    throw new Error('OPEN_WEBUI_API_KEY is not configured.');
  }

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
}

function resetRequestCount() {
  const now = Date.now();

  if (now - lastResetTime >= 60000) {
    requestCount = 0;
    lastResetTime = now;
  }
}

function checkRateLimit() {
  resetRequestCount();

  if (requestCount >= rateLimitPerMinute) {
    throw new Error(
      `Rate limit exceeded. Maximum ${rateLimitPerMinute} requests per minute.`
    );
  }

  requestCount++;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForChatCompletion(chatId, headers, deadline, baseUrl) {
  while (Date.now() < deadline) {
    const response = await axios.get(
      `${baseUrl}/api/tasks/chat/${encodeURIComponent(chatId)}`,
      { headers, timeout: 15000 }
    );

    const taskIds = response.data?.task_ids;

    if (!Array.isArray(taskIds)) {
      throw new Error(
        'Unexpected response from Open WebUI task-status endpoint.'
      );
    }

    if (taskIds.length === 0) {
      return;
    }

    await sleep(TASK_POLL_INTERVAL_MS);
  }

  throw new Error('Timed out waiting for Open WebUI to finish the chat.');
}

function getErrorDetail(error) {
  const detail =
    error.response?.data?.detail ||
    error.response?.data?.error?.message ||
    error.response?.data?.message;

  if (typeof detail === 'string') {
    return detail;
  }

  return error.message;
}

console.log(`OpenWebUI service configured with URL: ${process.env.OPEN_WEBUI_URL}`);
console.log(
  `Authentication: Using API Key ${
    process.env.OPEN_WEBUI_API_KEY ? '(configured)' : '(missing)'
  }`
);

function getToolIds() {
  return (process.env.OPEN_WEBUI_TOOL_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
}

async function sendMessage(text, model = null) {
  checkRateLimit();

  const baseUrl = getBaseUrl();
  const headers = getHeaders();
  const modelToUse =
    model || process.env.OPEN_WEBUI_DEFAULT_MODEL || 'gpt-4o';

  const userMessageId = randomUUID();
  const assistantMessageId = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const deadline = Date.now() + CHAT_TIMEOUT_MS;

  let chatId;

  try {
    console.log(`Using model: ${modelToUse}`);

    // Create a saved chat containing the user message and an empty assistant
    // message. Open WebUI needs these IDs to run its server-side tool loop.
    const created = await axios.post(
      `${baseUrl}/api/v1/chats/new`,
      {
        chat: {
          title: text.slice(0, 80) || 'Discord request',
          models: [modelToUse],
          history: {
            currentId: assistantMessageId,
            messages: {
              [userMessageId]: {
                id: userMessageId,
                role: 'user',
                content: text,
                timestamp,
                models: [modelToUse],
                childrenIds: [assistantMessageId]
              },
              [assistantMessageId]: {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                parentId: userMessageId,
                childrenIds: [],
                model: modelToUse,
                modelName: modelToUse,
                modelIdx: 0,
                done: false,
                timestamp: timestamp + 1
              }
            }
          }
        }
      },
      { headers, timeout: 30000 }
    );

    chatId = created.data?.id;

    if (!chatId) {
      throw new Error('Open WebUI did not return an ID for the new chat.');
    }

    const toolIds = getToolIds();

    // session_id enables built-in tools on Open WebUI's streaming chat path.
    // Do not add a `tools` property: that bypasses built-in tool resolution.
    await axios.post(
      `${baseUrl}/api/chat/completions`,
      {
        model: modelToUse,
        messages: [{ role: 'user', content: text }],
        stream: true,
        chat_id: chatId,
        id: assistantMessageId,
        session_id: `discord-${randomUUID()}`,
        features: {
          web_search: true,
          code_interpreter: false,
          image_generation: false,
          memory: false
        },
        ...(toolIds.length > 0 ? { tool_ids: toolIds } : {}),
        background_tasks: {
          title_generation: false,
          tags_generation: false,
          follow_up_generation: false
        }
      },
      { headers, timeout: 30000 }
    );

    await waitForChatCompletion(chatId, headers, deadline, baseUrl);

    const result = await axios.get(
      `${baseUrl}/api/v1/chats/${encodeURIComponent(chatId)}`,
      { headers, timeout: 15000 }
    );

    const assistantMessage =
      result.data?.chat?.history?.messages?.[assistantMessageId];

    if (!assistantMessage) {
      throw new Error(
        'Open WebUI finished, but the assistant message was not found.'
      );
    }

    const content =
      typeof assistantMessage.content === 'string'
        ? assistantMessage.content
        : JSON.stringify(
            assistantMessage.content ?? assistantMessage.output ?? ''
          );

    console.log('OpenWebUI request completed successfully.');

    return {
      content,
      model: assistantMessage.model || modelToUse,
      raw: assistantMessage
    };
  } catch (error) {
    console.error('Error sending message:', error.message);

    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please check the Open WebUI API key.');
    }

    if (error.response?.status === 404) {
      throw new Error(
        'Open WebUI API endpoint not found. Check the URL and Open WebUI version.'
      );
    }

    if (error.response?.status === 429) {
      throw new Error('Open WebUI rate limit exceeded. Please try again later.');
    }

    throw new Error(`Failed to get a response from Open WebUI: ${getErrorDetail(error)}`);
  } finally {
    // Remove the temporary chat after retrieving its answer.
    if (chatId) {
      try {
        await axios.delete(
          `${baseUrl}/api/v1/chats/${encodeURIComponent(chatId)}`,
          { headers, timeout: 15000 }
        );
      } catch (cleanupError) {
        console.warn(
          'Could not delete temporary Open WebUI chat:',
          cleanupError.message
        );
      }
    }
  }
}

async function getModels() {
  const cacheKey = 'available-models';
  const cachedModels = cache.get(cacheKey);

  if (cachedModels) {
    return cachedModels;
  }

  checkRateLimit();

  try {
    console.log('Fetching models from OpenWebUI');

    const response = await axios.get(`${getBaseUrl()}/api/models`, {
      headers: getHeaders(),
      timeout: 15000
    });

    let models = [];

    if (Array.isArray(response.data)) {
      models = response.data;
    } else if (Array.isArray(response.data?.data)) {
      models = response.data.data;
    } else if (Array.isArray(response.data?.models)) {
      models = response.data.models;
    }

    console.log(`Models request successful: found ${models.length} models`);
    cache.set(cacheKey, models);

    return models;
  } catch (error) {
    console.error('Error fetching models:', error.message);
    throw new Error(`Failed to fetch models: ${getErrorDetail(error)}`);
  }
}

async function getSystemStatus() {
  try {
    const response = await axios.get(`${getBaseUrl()}/api/health`, {
      timeout: 5000,
      validateStatus: () => true
    });

    return {
      status:
        response.status >= 200 && response.status < 300 ? 'online' : 'error',
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
