const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const openWebUI = require('../services/openWebUI');

module.exports = {
  cooldown: 15, // Higher cooldown due to potential API intensity
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a question to your Open WebUI instance')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The question or prompt you want to ask')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('model')
        .setDescription('The specific model ID to use (optional)')
        .setRequired(false)),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const modelId = interaction.options.getString('model') || process.env.OPEN_WEBUI_DEFAULT_MODEL || 'gpt-4o';
    
    // Send a thinking message
    await interaction.deferReply();
    
    try {
      console.log(`User ${interaction.user.tag} asked: ${question.substring(0, 50)}...`);
      console.log(`Using model: ${modelId}`);
      
      // Start the timer to measure response time
      const startTime = Date.now();
      
      // Send the message to Open WebUI
      const response = await openWebUI.sendMessage(question, modelId);
      
      // Calculate response time
      const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`Got response in ${responseTime}s`);
      
      if (!response) {
        return interaction.editReply('No response received from the model. Please check your OpenWebUI connection.');
      }
      
      let responseContent = '';
      let isHtmlResponse = false;
      
      // Check if we received HTML instead of a proper response
      if (typeof response.content === 'string' && 
          (response.content.trim().startsWith('<!DOCTYPE') || 
           response.content.trim().startsWith('<html') ||
           response.content.includes('</html>'))) {
        
        isHtmlResponse = true;
        responseContent = "Received HTML page instead of API response. Your Open WebUI instance may be returning its web interface instead of API data.\n\n" +
                         "Please check that:\n" +
                         "1. The API paths are properly whitelisted in Authentik\n" +
                         "2. Your Open WebUI version supports the API endpoints being used";
        
        console.error('Received HTML response from OpenWebUI');
      } else {
        responseContent = response.content;
      }
      
      if (!responseContent || responseContent.trim() === '') {
        return interaction.editReply('Received an empty response from the model. Please try again later.');
      }
      
      // Create an embed for the response
      const embed = new EmbedBuilder()
        .setColor(isHtmlResponse ? 0xFF0000 : 0x0099FF)
        .setTitle(isHtmlResponse ? 'Error: HTML Response Received' : 'AI Response')
        .setDescription(responseContent.slice(0, 4000)) // Discord limits to 4000 chars
        .addFields(
          { name: 'Response Time', value: `${responseTime}s`, inline: true },
          { name: 'Model', value: response.model || modelId || 'Default Model', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Prompted by ${interaction.user.username}` });
      
      // If the response exceeds Discord's limit, add a note
      if (responseContent.length > 4000) {
        embed.addFields({
          name: 'Note',
          value: `The full response was truncated. It exceeded Discord's 4000 character limit by ${responseContent.length - 4000} characters.`,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in ask command:', error);
      await interaction.editReply(`Error: Failed to get a response - ${error.message}`);
    }
  },
}; 