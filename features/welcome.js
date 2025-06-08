// features/welcome.js
const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createWelcomeCard } = require('../utils/welcomeCardGenerator');
const { logEvent } = require('../utils/logger');
const GuildSettings = require('../models/GuildSettings');

/**
 * Initializes the welcome system feature
 * @param {Client} client Discord.js client
 */
function init(client) {
  // Handle new member join events
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      // Get guild settings from database or collection
      const guildSettings = client.configs.get(member.guild.id) || 
                           await GuildSettings.findOne({ guildId: member.guild.id });
      
      if (!guildSettings || !guildSettings.welcomeEnabled || !guildSettings.welcomeChannelId) return;
      
      const welcomeChannel = member.guild.channels.cache.get(guildSettings.welcomeChannelId);
      if (!welcomeChannel) return;
      
      // Generate welcome card image
      const welcomeCard = await createWelcomeCard({
        username: member.user.username,
        avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
        memberCount: member.guild.memberCount,
        guildName: member.guild.name,
        backgroundURL: guildSettings.welcomeBackgroundURL || 'https://i.imgur.com/8BmNouD.png', // Default background
        primaryColor: guildSettings.welcomePrimaryColor || '#5865F2', // Discord blue
        secondaryColor: guildSettings.welcomeSecondaryColor || '#FFFFFF' // White
      });
      
      // Create attachment for the welcome card
      const attachment = new AttachmentBuilder(welcomeCard, { name: 'welcome-card.png' });
      
      // Create welcome embed
      const welcomeEmbed = new EmbedBuilder()
        .setColor(guildSettings.welcomePrimaryColor || '#5865F2')
        .setTitle('🎉 New Member Joined!')
        .setDescription(`Welcome to **${member.guild.name}**, ${member}! We're thrilled to have you here.`)
        .addFields(
          { name: 'Member Count', value: `You are our ${member.guild.memberCount}th member!`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setImage('attachment://welcome-card.png')
        .setFooter({ 
          text: `ID: ${member.id} • Joined ${new Date().toLocaleDateString()}`, 
          iconURL: member.guild.iconURL() 
        })
        .setTimestamp();
      
      // Send welcome message
      await welcomeChannel.send({
        content: guildSettings.welcomeMessage?.replace('{user}', member.toString()) || `Welcome ${member}!`,
        embeds: [welcomeEmbed],
        files: [attachment]
      });
      
      // Assign auto role if enabled
      if (guildSettings.autoRoleEnabled && guildSettings.autoRoleId) {
        try {
          await member.roles.add(guildSettings.autoRoleId);
          logEvent(member.guild, 'Auto-role assigned to new member', member.user);
        } catch (error) {
          logEvent(member.guild, 'Failed to assign auto-role', member.user, error);
        }
      }
      
      // Send welcome DM if enabled
      if (guildSettings.welcomeDmEnabled && guildSettings.welcomeDmMessage) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(guildSettings.welcomePrimaryColor || '#5865F2')
            .setTitle(`Welcome to ${member.guild.name}!`)
            .setDescription(guildSettings.welcomeDmMessage.replace('{user}', member.toString()))
            .setThumbnail(member.guild.iconURL({ dynamic: true }));
          
          if (guildSettings.rulesChannelId) {
            dmEmbed.addFields({ 
              name: 'Rules', 
              value: `Please check our rules in <#${guildSettings.rulesChannelId}>`
            });
          }
          
          await member.send({ embeds: [dmEmbed] });
          logEvent(member.guild, 'Welcome DM sent to new member', member.user);
        } catch (error) {
          logEvent(member.guild, 'Failed to send welcome DM', member.user, error);
        }
      }
    } catch (error) {
      console.error('Welcome system error:', error);
    }
  });

  // Log feature initialization
  console.log('Welcome feature initialized');
}

module.exports = { init };