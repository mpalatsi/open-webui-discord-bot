const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Set bot status
    client.user.setActivity('Open WebUI', { type: 'Listening' });
    
    console.log('Bot is ready! Run /ping in your Discord server to test it.');
  },
}; 