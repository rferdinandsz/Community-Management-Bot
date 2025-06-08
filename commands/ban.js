// commands/ban.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logModAction } = require('../utils/modLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for the ban')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('days')
        .setDescription('Delete messages from the last X days (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 0;
    
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    
    // Check if user is bannable
    if (member) {
      if (!member.bannable) {
        return interaction.reply({ content: 'I cannot ban this user due to role hierarchy or missing permissions.', ephemeral: true });
      }
      
      // Check if the user has higher role than the command user
      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({ content: 'You cannot ban someone with a higher or equal role.', ephemeral: true });
      }
    }
    
    try {
      await interaction.guild.members.ban(user.id, { deleteMessageDays: days, reason: `${interaction.user.tag}: ${reason}` });
      
      // Log the action
      await logModAction(interaction.guild.id, {
        type: 'ban',
        user: user.id,
        moderator: interaction.user.id,
        reason,
        timestamp: new Date()
      });
      
      await interaction.reply({ content: `Successfully banned ${user.tag}! Reason: ${reason}`, ephemeral: true });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `Failed to ban user: ${error.message}`, ephemeral: true });
    }
  },
};