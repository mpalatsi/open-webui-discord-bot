# Open WebUI Discord Bot

A Discord bot that interacts with a self-hosted Open WebUI instance, allowing you to access your AI models directly from Discord.

## Features

- `/ping` - Check bot latency and status
- `/status` - Get the status of your Open WebUI instance
- `/models` - List all available models in your Open WebUI instance
- `/ask` - Ask a question to your AI models through Open WebUI

## Prerequisites

- Node.js 16+ (if running without Docker)
- Discord Bot Token (from [Discord Developer Portal](https://discord.com/developers/applications))
- Self-hosted Open WebUI instance
- Open WebUI API key (generated from Settings > Account in Open WebUI)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/open-webui-discord-bot.git
cd open-webui-discord-bot
```

### 2. Configure environment variables

Create a `.env` file in the project root with the following variables:

```
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id

# Open WebUI Configuration
# Make sure this URL is publicly accessible from where the bot is hosted
OPEN_WEBUI_URL=https://your-openwebui-domain.com

# API Authentication
# Get your API key from Settings > Account in Open WebUI
OPEN_WEBUI_API_KEY=your_open_webui_api_key

# Rate Limiting (requests per minute)
RATE_LIMIT=10

# Optional: Port for status web server
PORT=3001
```

### 3. Install dependencies (if not using Docker)

```bash
npm install
```

### 4. Run the bot

#### Using Node.js directly

```bash
npm start
```

#### Using Docker Compose

```bash
docker-compose up -d
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" tab and create a bot
4. Enable the "MESSAGE CONTENT INTENT" under Privileged Gateway Intents
5. Copy the token and add it to your `.env` file
6. Go to OAuth2 > URL Generator
7. Select the following scopes: `bot`, `applications.commands`
8. Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`
9. Copy the generated URL and open it in your browser to add the bot to your server

## Docker Deployment

This bot is designed to be easily deployed in a Docker container. The provided Docker configuration includes:

- Health checks to ensure the bot is running
- Volume mapping for logs
- Environment variable configuration through `.env` file
- Automatic restart on failure

To build and run with Docker:

```bash
# Build the image
docker build -t open-webui-discord-bot .

# Run the container
docker run -d --name open-webui-discord-bot --env-file .env -p 3001:3001 open-webui-discord-bot
```

## Troubleshooting

### Connection Issues with Open WebUI

If you're experiencing connection issues with your Open WebUI instance, try these solutions:

1. **API Key Authentication**:
   - Make sure you've generated an API key in Open WebUI (Settings > Account)
   - Use this API key in your `.env` file as `OPEN_WEBUI_API_KEY`
   - The bot uses standard OpenAI-compatible API endpoints as documented in the official Open WebUI documentation

2. **Authentik SSO Configuration**:
   - If using Authentik, make sure to whitelist these paths:
   ```
   /api/models
   /api/chat/completions
   ```

3. **Check API Response Format**:
   - If you're getting HTML responses, check if your API endpoints are properly configured
   - Ensure your API key has the correct permissions

4. **OpenAI-Compatible API Format**:
   - This bot uses the OpenAI-compatible API format as documented
   - Messages are sent in the format:
   ```json
   {
     "model": "your_model_id",
     "messages": [
       { "role": "user", "content": "Your question here" }
     ]
   }
   ```

## Rate Limiting

The bot includes built-in rate limiting to prevent overloading your Open WebUI instance. By default, it's set to 10 requests per minute, but you can adjust this in the `.env` file.

