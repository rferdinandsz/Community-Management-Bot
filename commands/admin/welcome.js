// commands/admin/welcome.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable the welcome system')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable welcome messages')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Set the welcome channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to send welcome messages to')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('message')
        .setDescription('Set the welcome message text')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('The message to send (use {user} for the user mention)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('background')
        .setDescription('Set the welcome card background')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('URL of the background image')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('colors')
        .setDescription('Set the welcome card colors')
        .addStringOption(option =>
          option.setName('primary')
            .setDescription('Primary color in hex format (e.g., #5865F2)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('secondary')
            .setDescription('Secondary color in hex format (e.g., #FFFFFF)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('autorole')
        .setDescription('Configure auto-role for new members')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable auto-role assignment')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to assign to new members')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current welcome settings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      // Get or create guild settings
      let guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });
      
      if (!guildSettings) {
        guildSettings = new GuildSettings({ guildId: interaction.guild.id });
      }
      
      switch (subcommand) {
        case 'toggle':
          const enabled = interaction.options.getBoolean('enabled');
          guildSettings.welcomeEnabled = enabled;
          await guildSettings.save();
          
          // Update client cache
          client.configs.set(interaction.guild.id, guildSettings);
          
          return interaction.reply({
            content: `Welcome system has been ${enabled ? 'enabled' : 'disabled'}.`,
            ephemeral: true
          });
          
        case 'channel':
          const channel = interaction.options.getChannel('channel');
          guildSettings.welcomeChannelId = channel.id;
          await guildSettings.save();
          
          // Update client cache
          client.configs.set(interaction.guild.id, guildSettings);
          
          return interaction.reply({
            content: `Welcome channel has been set to ${channel}.`,
            ephemeral: true
          });
          
        case 'message':
          const message = interaction.options.getString('message');
          guildSettings.welcomeMessage = message;
          await guildSettings.save();
          
          // Update client cache
          client.configs.set(interaction.guild.id, guildSettings);
          
          return interaction.reply({
            content: `Welcome message has been updated to: ${message}`,
            ephemeral: true
          });
          
        case 'background':
          const url = interaction.options.getString('url');
          guildSettings.welcomeBackgroundURL = url;
          await guildSettings.save();
          
          // Update client cache
          client.configs.set(interaction.guild.id, guildSettings);
          
          return interaction.reply({
            content: `Welcome card background has been updated.`,
            ephemeral: true
          });
        
        case 'colors':
          const primaryColor = interaction.options.getString('primary');
          const secondaryColor = interaction.options.getString('secondary');
          
          // Validate hex colors
          const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexColorRegex.test(primaryColor)) {
            return interaction.reply({
              content: 'Invalid primary color format. Please use a valid hex color (e.g., #5865F2).',
              ephemeral: true
            });
          }
          
          if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
            return interaction.reply({
              content: 'Invalid secondary color format. Please use a valid hex color (e.g., #FFFFFF).',
              ephemeral: true
            });
          }
          
          guildSettings.welcomePrimaryColor = primaryColor;
          if (secondaryColor) {
            guildSettings.welcomeSecondaryColor = secondaryColor;
          }
          
          await guildSettings.save();
          
          // Update client cache
          client.configs.set(interaction.guild.id, guildSettings);
          
          return interaction.reply({
            content: `Welcome card colors have been updated.`,
            ephemeral: true
          });
          
        case 'autorole':
          const autoRoleEnabled = interaction.options.getBoolean('enabled');
          const role = interaction.options.getRole('role');
          
          guildSettings.autoRoleEnabled = autoRoleEnabled;
          
          if (autoRoleEnabled && !role && !guildSettings.autoRoleId) {
            return interaction.reply({
              content: 'You must specify a role when enabling auto-role.',
              ephemeral: true
            });
          }
          
          if (role) {
            // Check if role is manageable by the bot
            if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
              return interaction.reply({
                content: 'I cannot assign this role to new members. Please choose a role that is below my highest role.',
                ephemeral: true
              });
            }
            
            guildSettings.autoRoleId = role.id;
          }
          
          await guildSettings.save();
          
          // Update client cache
          client.configs.set(interaction.guild.id, guildSettings);
          
          return interaction.reply({
            content: `Auto-role has been ${autoRoleEnabled ? 'enabled' : 'disabled'}${role ? ` with role ${role}` : ''}.`,
            ephemeral: true
          });
          
        case 'view':
          const settings = guildSettings;
          
          const welcomeChannel = settings.welcomeChannelId ? 
            interaction.guild.channels.cache.get(settings.welcomeChannelId) : null;
            
          const autoRole = settings.autoRoleId ? 
            interaction.guild.roles.cache.get(settings.autoRoleId) : null;
          
          const settingsEmbed = new EmbedBuilder()
            .setColor(settings.welcomePrimaryColor || '#5865F2')
            .setTitle('Welcome System Settings')
            .setDescription(`Here are the current welcome settings for **${interaction.guild.name}**`)
            .addFields(
              { name: 'Status', value: settings.welcomeEnabled ? 'Enabled ✅' : 'Disabled ❌', inline: true },
              { name: 'Welcome Channel', value: welcomeChannel ? `<#${settings.welcomeChannelId}>` : 'Not Set', inline: true },
              { name: 'Welcome Message', value: settings.welcomeMessage || 'Default', inline: false },
              { name: 'Auto-Role', value: `${settings.autoRoleEnabled ? 'Enabled ✅' : 'Disabled ❌'}${autoRole ? ` - <@&${settings.autoRoleId}>` : ''}`, inline: false },
              { name: 'Colors', value: `Primary: \`${settings.welcomePrimaryColor || '#5865F2'}\`\nSecondary: \`${settings.welcomeSecondaryColor || '#FFFFFF'}\``, inline: false }
            )
            .setFooter({ text: `Server ID: ${interaction.guild.id}` })
            .setTimestamp();
            
          if (settings.welcomeBackgroundURL) {
            settingsEmbed.setThumbnail(settings.welcomeBackgroundURL);
          }
          
          return interaction.reply({
            embeds: [settingsEmbed],
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('Error with welcome command:', error);
      return interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true
      });
    }
  },
};