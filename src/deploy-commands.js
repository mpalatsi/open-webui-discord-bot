require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function registerCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  
  // Check if directory exists
  if (!fs.existsSync(commandsPath)) {
    console.log(`Commands directory does not exist at ${commandsPath}`);
    return [];
  }
  
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  // If no command files, return early
  if (commandFiles.length === 0) {
    console.log('No command files found to register');
    return [];
  }

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }

  // If no valid commands were found
  if (commands.length === 0) {
    console.log('No valid commands found to register');
    return [];
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = { registerCommands }; 