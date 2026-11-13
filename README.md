# Open WebUI Discord Bot

A Discord bot that connects to a self-hosted Open WebUI instance so you can use its models from Discord.

## Features

- `/ping` — Check the bot’s latency and status.
- `/status` — Check the Open WebUI instance’s health.
- `/models` — List available Open WebUI models.
- `/ask` — Ask a question using an Open WebUI model, with model autocomplete.
- Web search and selected Open WebUI tools.
- Request rate limiting.
- Long responses handled to fit Discord’s message and embed limits.

## Prerequisites

- Node.js 16 or later if running without Docker.
- A Discord application and bot token.
- A self-hosted Open WebUI instance reachable from the bot.
- An Open WebUI API key with access to the required API endpoints.

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/aredon/open-webui-discord-bot.git
cd open-webui-discord-bot
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Add the following to `.env`:

```dotenv
# Discord bot configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id

# Open WebUI configuration
OPEN_WEBUI_URL=https://your-openwebui-domain.com
OPEN_WEBUI_API_KEY=your_open_webui_api_key

# Optional: comma-separated Open WebUI tool IDs
OPEN_WEBUI_TOOL_IDS=

# Optional: requests allowed per minute (defaults to 10)
RATE_LIMIT=10

# Optional: status web server port
PORT=3001
```

`OPEN_WEBUI_URL` should be the base URL of your Open WebUI instance, without an API path appended. Keep your API key private and do not commit `.env` to the repository.

`OPEN_WEBUI_TOOL_IDS` is optional. Add the IDs of the workspace, MCP, or OpenAPI tools you want the bot to pass to Open WebUI, separated by commas. Leave it empty if you do not want to explicitly pass tool IDs.

Web search is enabled in chat requests. Open WebUI must also have web search configured and available to the user or model. The bot explicitly disables `code_interpreter`, `image_generation`, and `memory`.

### 3. Install dependencies

Skip this step if you are using Docker.

```bash
npm install
```

### 4. Start the bot

Using Node.js:

```bash
npm start
```

Using Docker Compose:

```bash
docker-compose up -d
```

## Discord bot setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Open the application’s **Bot** page and create a bot.
3. Copy the bot token into `DISCORD_TOKEN`.
4. Open **OAuth2 → URL Generator** and select the `bot` and `applications.commands` scopes.
5. Grant the bot the permissions it needs, including **Send Messages** and **Embed Links**.
6. Use the generated URL to invite the bot to your server.
7. Set `CLIENT_ID` to your application ID. Set `GUILD_ID` if required by the project’s command registration setup.

## Open WebUI tools

The bot sends requests through Open WebUI’s OpenAI-compatible API. It enables the `web_search` feature and, when configured, passes `OPEN_WEBUI_TOOL_IDS` as `tool_ids`.

To use web search or other tools:

1. Enable and configure web search or the desired tools in Open WebUI.
2. Find the IDs of any workspace, MCP, or OpenAPI tools you want the bot to use.
3. Add those IDs to `OPEN_WEBUI_TOOL_IDS`, separated by commas.
4. Restart the bot after changing the environment variable.

Tool availability may depend on Open WebUI configuration, user permissions, and model support.

## Rate limiting

The bot limits requests to Open WebUI. The default is 10 requests per minute. Set `RATE_LIMIT` in `.env` to change the configured limit, then restart the bot.

## Long responses

Discord limits message and embed text. The bot handles long Open WebUI responses so they can be sent within Discord’s limits instead of as one oversized response.

## Docker deployment

Build and run the image directly:

```bash
docker build -t open-webui-discord-bot .
docker run -d --name open-webui-discord-bot --env-file .env -p 3001:3001 open-webui-discord-bot
```

The Docker configuration includes health checks, log volume mapping, environment-variable configuration through `.env`, and restart behavior. Check the Docker files for the configured ports and volume paths.

## Troubleshooting

### Open WebUI connection or authentication errors

- Confirm `OPEN_WEBUI_URL` is reachable from the machine or container running the bot.
- Check that `OPEN_WEBUI_API_KEY` is valid and has the necessary access.
- Confirm that the URL is the Open WebUI base URL, not a specific API endpoint.
- If a reverse proxy or SSO service is in front of Open WebUI, ensure it allows the bot’s API requests and authorization header.

### Models do not appear in `/ask` autocomplete

- Check that the API key can access the models.
- Confirm the bot can reach Open WebUI’s models endpoint.
- The model list is cached for five minutes, so changes may take a short time to appear.

### Web search or tools are unavailable

- Verify that web search or the selected tools are enabled and configured in Open WebUI.
- Check that the tool IDs in `OPEN_WEBUI_TOOL_IDS` are correct and comma-separated.
- Confirm that the Open WebUI user associated with the API key is permitted to use those tools.

### Responses fail or are incomplete

Check the bot and Open WebUI logs for API errors, timeouts, or permission issues. Network and reverse-proxy timeout settings can also affect long-running requests.
