// index.js - Main entry point for the Discord bot

// Import required modules
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Collection, 
  Events
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Create Discord client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,               // For server-related events
    GatewayIntentBits.GuildMembers,         // For member events (join/leave)
    GatewayIntentBits.GuildMessages,        // For message events
    GatewayIntentBits.GuildMessageReactions, // For reaction events
    GatewayIntentBits.DirectMessages,       // For DM events
    GatewayIntentBits.MessageContent,       // To access message content
    GatewayIntentBits.GuildVoiceStates,     // For voice channel events
    GatewayIntentBits.GuildPresences,       // For presence updates
    GatewayIntentBits.GuildInvites,         // For invite tracking
    GatewayIntentBits.GuildModeration       // For moderation events
  ],
  partials: [
    Partials.Message,           // For handling partial messages
    Partials.Channel,           // For handling partial channels
    Partials.Reaction,          // For handling partial reactions
    Partials.GuildMember,       // For handling partial guild members
    Partials.User,              // For handling partial users
    Partials.ThreadMember       // For handling partial thread members
  ]
});

// Create collections to store commands and other data
client.commands = new Collection();
client.cooldowns = new Collection();
client.buttonHandlers = new Collection();
client.selectMenuHandlers = new Collection();
client.contextMenuHandlers = new Collection();
client.modalHandlers = new Collection();

// Bot configuration storage
client.configs = new Collection();

// Database Models
const GuildSettings = require('./models/GuildSettings');

// Load commands
const loadCommands = () => {
  const commandFolders = fs.readdirSync('./commands');
  
  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`./commands/${folder}/${file}`);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
      } else {
        console.log(`[WARNING] The command at ./commands/${folder}/${file} is missing required "data" or "execute" property.`);
      }
    }
  }
};

// Load event handlers
const loadEvents = () => {
  const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
  
  for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
    console.log(`Loaded event: ${event.name}`);
  }
};

// Load button handlers
const loadButtonHandlers = () => {
  const buttonFiles = fs.readdirSync('./interactions/buttons').filter(file => file.endsWith('.js'));
  
  for (const file of buttonFiles) {
    const button = require(`./interactions/buttons/${file}`);
    client.buttonHandlers.set(button.customId, button);
    console.log(`Loaded button handler: ${button.customId}`);
  }
};

// Load select menu handlers
const loadSelectMenuHandlers = () => {
  const menuFiles = fs.readdirSync('./interactions/selectMenus').filter(file => file.endsWith('.js'));
  
  for (const file of menuFiles) {
    const menu = require(`./interactions/selectMenus/${file}`);
    client.selectMenuHandlers.set(menu.customId, menu);
    console.log(`Loaded select menu handler: ${menu.customId}`);
  }
};

// Load context menu handlers
const loadContextMenuHandlers = () => {
  const contextFiles = fs.readdirSync('./interactions/contextMenus').filter(file => file.endsWith('.js'));
  
  for (const file of contextFiles) {
    const context = require(`./interactions/contextMenus/${file}`);
    client.contextMenuHandlers.set(context.data.name, context);
    console.log(`Loaded context menu: ${context.data.name}`);
  }
};

// Load modal handlers
const loadModalHandlers = () => {
  const modalFiles = fs.readdirSync('./interactions/modals').filter(file => file.endsWith('.js'));
  
  for (const file of modalFiles) {
    const modal = require(`./interactions/modals/${file}`);
    client.modalHandlers.set(modal.customId, modal);
    console.log(`Loaded modal handler: ${modal.customId}`);
  }
};

// Load feature modules
const loadFeatures = () => {
  const featureFiles = fs.readdirSync('./features').filter(file => file.endsWith('.js'));
  
  for (const file of featureFiles) {
    const feature = require(`./features/${file}`);
    if (feature.init) {
      feature.init(client);
    }
    console.log(`Loaded feature: ${file}`);
  }
};

// Database connection
const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB database');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Load guild settings from database
const loadGuildSettings = async () => {
  try {
    const guilds = await GuildSettings.find({});
    for (const guild of guilds) {
      client.configs.set(guild.guildId, guild);
    }
    console.log(`Loaded settings for ${guilds.length} guilds`);
  } catch (error) {
    console.error('Error loading guild settings:', error);
  }
};

// Handle interaction events (buttons, select menus, context menus, modals)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      
      // Handle command cooldowns
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }
      
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;
      
      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({
            content: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`,
            ephemeral: true
          });
        }
      }
      
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
      
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
    }
    // Handle buttons
    else if (interaction.isButton()) {
      const handler = client.buttonHandlers.get(interaction.customId) || 
                     client.buttonHandlers.find(h => interaction.customId.startsWith(h.customId.split(':')[0]));
      
      if (!handler) return;
      
      try {
        await handler.execute(interaction, client);
      } catch (error) {
        console.error(`Error handling button interaction (${interaction.customId}):`, error);
        await interaction.reply({ content: 'There was an error while processing this button!', ephemeral: true });
      }
    }
    // Handle select menus
    else if (interaction.isStringSelectMenu()) {
      const handler = client.selectMenuHandlers.get(interaction.customId) ||
                     client.selectMenuHandlers.find(h => interaction.customId.startsWith(h.customId.split(':')[0]));
      
      if (!handler) return;
      
      try {
        await handler.execute(interaction, client);
      } catch (error) {
        console.error(`Error handling select menu interaction (${interaction.customId}):`, error);
        await interaction.reply({ content: 'There was an error while processing this select menu!', ephemeral: true });
      }
    }
    // Handle context menu commands
    else if (interaction.isContextMenuCommand()) {
      const contextCommand = client.contextMenuHandlers.get(interaction.commandName);
      
      if (!contextCommand) return;
      
      try {
        await contextCommand.execute(interaction, client);
      } catch (error) {
        console.error(`Error handling context menu command (${interaction.commandName}):`, error);
        await interaction.reply({ content: 'There was an error while processing this context menu command!', ephemeral: true });
      }
    }
    // Handle modals
    else if (interaction.isModalSubmit()) {
      const handler = client.modalHandlers.get(interaction.customId) ||
                     client.modalHandlers.find(h => interaction.customId.startsWith(h.customId.split(':')[0]));
      
      if (!handler) return;
      
      try {
        await handler.execute(interaction, client);
      } catch (error) {
        console.error(`Error handling modal interaction (${interaction.customId}):`, error);
        await interaction.reply({ content: 'There was an error while processing this form!', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Interaction handling error:', error);
  }
});

// Initialize the bot
const init = async () => {
  try {
    // Connect to database first
    await connectDatabase();
    
    // Load all handlers
    loadCommands();
    loadEvents();
    loadButtonHandlers();
    loadSelectMenuHandlers();
    loadContextMenuHandlers();
    loadModalHandlers();
    
    // Load feature modules
    loadFeatures();
    
    // Load guild settings from database
    await loadGuildSettings();
    
    // Login to Discord
    await client.login(process.env.TOKEN);
    console.log('Bot is now online!');
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
};

// Process error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
  // Consider uncommenting if you want to automatically restart on critical errors
  // process.exit(1); 
});

// Initialize the bot
init();