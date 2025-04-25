# Open WebUI Discord Bot for Unraid

This guide provides instructions for deploying the Open WebUI Discord Bot on Unraid using Docker Compose.

## Prerequisites

1. Unraid server with Docker installed
2. Docker Compose plugin installed
3. A Discord bot token (see [Discord Developer Portal](https://discord.com/developers/applications))
4. Access to an Open WebUI instance with API key

## Installation

### Step 1: Prepare the Unraid Environment

Create the following directory structure on your Unraid server:

```
/mnt/user/appdata/open-webui-discord-bot/
```

### Step 2: Copy Application Files to Appdata

Copy all necessary application files to your Unraid appdata directory:

```
/mnt/user/appdata/open-webui-discord-bot/src/         # All source code files
/mnt/user/appdata/open-webui-discord-bot/package.json
/mnt/user/appdata/open-webui-discord-bot/package-lock.json
/mnt/user/appdata/open-webui-discord-bot/docker-compose.yml
```

You can do this using Unraid's file manager or via SSH.

### Step 3: Set Up the .env File

Create a file at `/mnt/user/appdata/open-webui-discord-bot/.env` with the following content, replacing the placeholder values with your actual configuration:

```
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id

# Open WebUI API Configuration
OPEN_WEBUI_URL=https://your-openwebui-domain.com
OPEN_WEBUI_API_KEY=your_open_webui_api_key
OPEN_WEBUI_DEFAULT_MODEL=gpt-4o

# Performance Settings
RATE_LIMIT=10
PORT=3005
```

### Step 4: Deploy with Docker Compose

Using the Unraid Docker Compose plugin:

1. Navigate to the Docker tab in your Unraid web interface
2. Click "Add Container" 
3. Select "Advanced View"
4. In the "Docker Compose" tab, enter: `/mnt/user/appdata/open-webui-discord-bot/docker-compose.yml`
5. Click "Apply"

The bot will automatically:
- Use the official Node.js Alpine image
- Install necessary dependencies
- Run with proper permissions
- Store everything in your appdata directory for persistence

## Monitoring & Maintenance

### Logs

Logs are stored at `/mnt/user/appdata/open-webui-discord-bot/logs/`

### Updating

To update the bot:

1. Update the source code files in `/mnt/user/appdata/open-webui-discord-bot/src/`
2. Restart the container from the Unraid Docker interface

## Troubleshooting

### Bot Not Connecting

- Check the Discord token in your .env file
- Ensure proper permissions for your Discord bot
- View container logs in the Unraid Docker interface

### API Connection Issues

- Verify your Open WebUI URL is accessible from Unraid
- Confirm your API key is valid 
- Check network connectivity between Unraid and Open WebUI

### Permission Problems

If you encounter permission issues:
1. Ensure your volumes are mapped correctly
2. The app runs as the `node` user (uid 1000) inside the container
3. You may need to set proper permissions with: `chmod -R 755 /mnt/user/appdata/open-webui-discord-bot`

## Docker Compose Labels

The docker-compose.yml file includes Unraid-specific labels to improve the user experience in the Docker tab. These labels help identify and categorize the container within your Unraid system. 