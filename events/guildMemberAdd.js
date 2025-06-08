// events/guildMemberAdd.js
const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/guildSettings');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const settings = await getGuildSettings(member.guild.id);
    if (!settings.welcomeEnabled || !settings.welcomeChannelId) return;
    
    const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannelId);
    if (!welcomeChannel) return;
    
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Welcome to the server!')
      .setDescription(`Welcome ${member} to **${member.guild.name}**!`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Member Count', value: `You are our ${member.guild.memberCount}th member!` },
        { name: 'Server Rules', value: `Please check out <#${settings.rulesChannelId || 'rules'}>` }
      )
      .setImage(settings.welcomeImage || null)
      .setTimestamp();
    
    await welcomeChannel.send({ embeds: [welcomeEmbed] });
    
    // If auto-role is enabled
    if (settings.autoRoleEnabled && settings.autoRoleId) {
      try {
        await member.roles.add(settings.autoRoleId);
      } catch (error) {
        console.error(`Failed to add auto-role: ${error}`);
      }
    }
    
    // Send welcome DM if enabled
    if (settings.welcomeDmEnabled) {
      try {
        await member.send({ 
          content: `Welcome to **${member.guild.name}**! We're glad to have you here.` 
        });
      } catch (error) {
        console.error(`Failed to send welcome DM: ${error}`);
      }
    }
  },
};