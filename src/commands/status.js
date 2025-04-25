const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const openWebUI = require('../services/openWebUI');

module.exports = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Get the status of your Open WebUI instance'),
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      console.log('Fetching OpenWebUI status...');
      const status = await openWebUI.getSystemStatus();
      console.log('Status response:', JSON.stringify(status).slice(0, 200));
      
      let fields = [];
      
      // Handle different possible response formats
      if (typeof status === 'object' && status !== null) {
        // Try to extract common fields, with fallbacks
        fields = [
          { name: 'Status', value: extractField(status, ['status', 'state']) || 'Unknown', inline: true },
          { name: 'Version', value: extractField(status, ['version', 'app_version']) || 'Unknown', inline: true }
        ];
        
        // Add active model if available
        const activeModel = extractField(status, ['active_model', 'model', 'current_model']);
        if (activeModel) {
          fields.push({ name: 'Active Model', value: activeModel, inline: true });
        }
        
        // Add backend if available
        const backend = extractField(status, ['backend', 'backend_type', 'engine']);
        if (backend) {
          fields.push({ name: 'Backend', value: backend, inline: true });
        }
        
        // Add uptime if available
        const uptime = extractField(status, ['uptime', 'up_time']);
        if (uptime !== undefined && uptime !== null) {
          const uptimeValue = typeof uptime === 'number' 
            ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
            : uptime.toString();
          fields.push({ name: 'Uptime', value: uptimeValue, inline: true });
        }
        
        // Add any other interesting fields that might be in the response
        const extraFields = Object.entries(status)
          .filter(([key, value]) => 
            !['status', 'version', 'active_model', 'backend', 'uptime', 'model', 'current_model', 'backend_type', 'engine', 'state', 'app_version', 'up_time'].includes(key) &&
            typeof value !== 'object' &&
            value !== undefined &&
            value !== null
          )
          .slice(0, 5); // Take max 5 extra fields
        
        extraFields.forEach(([key, value]) => {
          fields.push({ 
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), 
            value: value.toString(),
            inline: true 
          });
        });
      } else {
        // Fallback if status is not an object
        fields = [
          { name: 'Status', value: 'Unknown format received', inline: false },
          { name: 'Raw Response', value: typeof status === 'string' ? status.slice(0, 1000) : JSON.stringify(status).slice(0, 1000), inline: false }
        ];
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Open WebUI Status')
        .setDescription('Current status of your Open WebUI instance')
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: 'Open WebUI Discord Bot' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in status command:', error);
      await interaction.editReply(`Error: Failed to fetch Open WebUI status - ${error.message}`);
    }
  },
};

// Helper function to extract a value from an object with multiple possible keys
function extractField(obj, possibleKeys) {
  for (const key of possibleKeys) {
    if (obj[key] !== undefined) {
      return obj[key];
    }
  }
  return null;
} 