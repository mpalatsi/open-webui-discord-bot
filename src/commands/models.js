const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const openWebUI = require('../services/openWebUI');

module.exports = {
  cooldown: 15,
  data: new SlashCommandBuilder()
    .setName('models')
    .setDescription('List available models from your Open WebUI instance'),
  async execute(interaction) {
    // Send a thinking message
    await interaction.deferReply();
    
    try {
      console.log(`User ${interaction.user.tag} requested model list`);
      
      // Start the timer to measure response time
      const startTime = Date.now();
      
      // Try to get models using different approaches
      let models = [];
      let errorMessage = '';
      
      try {
        // First try the standard API
        models = await openWebUI.getModels();
      } catch (standardError) {
        console.log('Standard model fetch failed:', standardError.message);
        errorMessage += `Standard API failed: ${standardError.message}\n`;
        
        // Try Ollama endpoint
        try {
          const ollamaResponse = await openWebUI.getOllamaModels();
          if (ollamaResponse && ollamaResponse.length > 0) {
            models = ollamaResponse;
          }
        } catch (ollamaError) {
          console.log('Ollama model fetch failed:', ollamaError.message);
          errorMessage += `Ollama API failed: ${ollamaError.message}\n`;
        }
      }
      
      // Calculate response time
      const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`Got response in ${responseTime}s`);
      
      if (models.length === 0) {
        return interaction.editReply(`No models found. The following errors occurred:\n${errorMessage}`);
      }
      
      // Format the list of models
      const modelList = models.map(model => {
        const name = model.name || model.id || 'Unknown';
        const id = model.id || 'unknown';
        return `- **${name}** (ID: \`${id}\`)`;
      }).join('\n');
      
      // Create an embed for the response
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Available Models')
        .setDescription(modelList.slice(0, 4000))
        .addFields(
          { name: 'Response Time', value: `${responseTime}s`, inline: true },
          { name: 'Total Models', value: `${models.length}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.username}` });
      
      // If the response exceeds Discord's limit, add a note
      if (modelList.length > 4000) {
        embed.addFields({
          name: 'Note',
          value: `The full model list was truncated. It exceeded Discord's 4000 character limit by ${modelList.length - 4000} characters.`,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in models command:', error);
      await interaction.editReply(`Error: Failed to get models - ${error.message}`);
    }
  },
}; 