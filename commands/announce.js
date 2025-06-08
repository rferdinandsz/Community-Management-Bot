// commands/announce.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to a channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to send the announcement to')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('title')
        .setDescription('The title of the announcement')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message of the announcement')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('color')
        .setDescription('The color of the announcement (hex code)')
        .setRequired(false))
    .addAttachmentOption(option => 
      option.setName('image')
        .setDescription('An image for the announcement')
        .setRequired(false))
    .addRoleOption(option => 
      option.setName('ping')
        .setDescription('The role to ping')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const color = interaction.options.getString('color') || '#5865F2';
    const image = interaction.options.getAttachment('image');
    const role = interaction.options.getRole('ping');
    
    const announcementEmbed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: `Announcement by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
    
    if (image) {
      announcementEmbed.setImage(image.url);
    }
    
    let content = '';
    if (role) {
      content = `<@&${role.id}>`;
    }
    
    await channel.send({ content, embeds: [announcementEmbed] });
    await interaction.reply({ content: `Announcement sent to ${channel}!`, ephemeral: true });
  },
};