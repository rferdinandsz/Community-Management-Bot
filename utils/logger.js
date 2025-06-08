// utils/logger.js
const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

/**
 * Logs an event to the guild's logging channel
 * @param {Guild} guild Discord guild object
 * @param {string} message Log message
 * @param {User} [user] Associated user
 * @param {Error} [error] Error object if applicable
 */
async function logEvent(guild, message, user, error) {
  try {
    // Get guild settings
    const settings = await GuildSettings.findOne({ guildId: guild.id });
    
    if (!settings || !settings.loggingEnabled || !settings.loggingChannelId) return;
    
    const logChannel = guild.channels.cache.get(settings.loggingChannelId);
    if (!logChannel) return;
    
    const logEmbed = new EmbedBuilder()
      .setColor('#FF9900') // Orange for logs
      .setTitle('Bot Log')
      .setDescription(message)
      .setTimestamp();
    
    if (user) {
      logEmbed
        .addFields({ name: 'User', value: `${user.tag} (${user.id})`, inline: true })
        .setThumbnail(user.displayAvatarURL({ dynamic: true }));
    }
    
    if (error) {
      logEmbed.addFields({ name: 'Error', value: `\`\`\`${error.message}\`\`\`` });
    }
    
    await logChannel.send({ embeds: [logEmbed] });
  } catch (err) {
    console.error('Logging error:', err);
  }
}

// Export utility functions
module.exports = {
  logEvent
};