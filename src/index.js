require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { registerCommands } = require('./deploy-commands');

// Create Discord client
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ] 
});

// Initialize collections
client.commands = new Collection();
client.cooldowns = new Collection();

// Command handler setup
const commandsPath = path.join(__dirname, 'commands');
// Ensure directories exist
if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath, { recursive: true });
  console.log(`Created directory: ${commandsPath}`);
}

// Load commands if directory exists and has files
const commandFiles = fs.existsSync(commandsPath) 
  ? fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')) 
  : [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Event handler setup
const eventsPath = path.join(__dirname, 'events');
// Ensure directories exist
if (!fs.existsSync(eventsPath)) {
  fs.mkdirSync(eventsPath, { recursive: true });
  console.log(`Created directory: ${eventsPath}`);
}

// Load events if directory exists and has files
const eventFiles = fs.existsSync(eventsPath)
  ? fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'))
  : [];

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Ensure services directory exists
const servicesPath = path.join(__dirname, 'services');
if (!fs.existsSync(servicesPath)) {
  fs.mkdirSync(servicesPath, { recursive: true });
  console.log(`Created directory: ${servicesPath}`);
}

// Simple web server for status checks (useful for Docker health checks)
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Open WebUI Discord Bot is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Start server with error handling for port in use
const server = app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying alternative port...`);
    // Try to use a different port
    server.close();
    const newServer = app.listen(0, () => { // Port 0 means the OS will assign an available port
      console.log(`Health check server running on port ${newServer.address().port}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

// Register basic ready event if no event files
if (eventFiles.length === 0) {
  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });
}

// Register commands on startup
(async () => {
  try {
    // Only try to register commands if we have any
    if (commandFiles.length > 0) {
      await registerCommands();
      console.log('Commands registered successfully!');
    } else {
      console.log('No commands to register.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

// Login to Discord
client.login(process.env.DISCORD_TOKEN); 