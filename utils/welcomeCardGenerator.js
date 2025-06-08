// utils/welcomeCardGenerator.js
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Register fonts for the welcome card
registerFont(path.join(__dirname, '../assets/fonts/Montserrat-Bold.ttf'), { family: 'Montserrat', weight: 'bold' });
registerFont(path.join(__dirname, '../assets/fonts/Montserrat-Medium.ttf'), { family: 'Montserrat', weight: 'medium' });
registerFont(path.join(__dirname, '../assets/fonts/Montserrat-Regular.ttf'), { family: 'Montserrat', weight: 'regular' });

/**
 * Creates a beautiful welcome card for new members
 * @param {Object} options Card generation options
 * @param {string} options.username User's username
 * @param {string} options.avatarURL URL to user's avatar
 * @param {number} options.memberCount Server's member count
 * @param {string} options.guildName Name of the guild
 * @param {string} options.backgroundURL URL to background image
 * @param {string} options.primaryColor Primary color in hex
 * @param {string} options.secondaryColor Secondary color in hex
 * @returns {Buffer} Image buffer of the welcome card
 */
async function createWelcomeCard({
  username,
  avatarURL,
  memberCount,
  guildName,
  backgroundURL,
  primaryColor = '#5865F2',
  secondaryColor = '#FFFFFF'
}) {
  // Create canvas (1100 x 500)
  const canvas = createCanvas(1100, 500);
  const ctx = canvas.getContext('2d');
  
  // Load background image
  try {
    const background = await loadImage(backgroundURL);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  } catch (error) {
    console.error('Error loading background image:', error);
    // Fill with a gradient if background fails to load
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#36393f');
    gradient.addColorStop(1, '#2f3136');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Add semi-transparent overlay to make text more readable
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add a decorative band across the image
  ctx.fillStyle = primaryColor;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(0, canvas.height - 200, canvas.width, 80);
  ctx.globalAlpha = 1;
  
  // Add welcome text
  ctx.font = 'bold 60px Montserrat';
  ctx.textAlign = 'center';
  ctx.fillStyle = secondaryColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText('WELCOME', canvas.width / 2, 100);
  
  // Add server name
  ctx.font = 'bold 40px Montserrat';
  ctx.fillText(`TO ${guildName.toUpperCase()}`, canvas.width / 2, 150);
  
  // Load and draw user avatar with circle mask
  try {
    const avatar = await loadImage(avatarURL);
    
    // Save context state for clipping
    ctx.save();
    
    // Draw avatar circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 250, 120, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    // Draw avatar with border
    ctx.drawImage(avatar, canvas.width / 2 - 120, 250 - 120, 240, 240);
    
    // Restore context state
    ctx.restore();
    
    // Draw avatar border
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 250, 123, 0, Math.PI * 2, true);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 6;
    ctx.stroke();
  } catch (error) {
    console.error('Error loading avatar image:', error);
  }
  
  // Reset shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Add username
  ctx.font = 'bold 45px Montserrat';
  ctx.textAlign = 'center';
  ctx.fillStyle = secondaryColor;
  
  // Handle long usernames
  const maxUsernameWidth = 800;
  let usernameFontSize = 45;
  ctx.font = `bold ${usernameFontSize}px Montserrat`;
  
  while (ctx.measureText(username).width > maxUsernameWidth) {
    usernameFontSize -= 2;
    ctx.font = `bold ${usernameFontSize}px Montserrat`;
  }
  
  ctx.fillText(username, canvas.width / 2, 420);
  
  // Add member count text
  ctx.font = 'medium 30px Montserrat';
  ctx.fillText(`You are member #${memberCount}`, canvas.width / 2, 470);
  
  // Add decorative elements
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 200, 430);
  ctx.lineTo(canvas.width / 2 - 50, 430);
  ctx.moveTo(canvas.width / 2 + 50, 430);
  ctx.lineTo(canvas.width / 2 + 200, 430);
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  
  // Return buffer
  return canvas.toBuffer();
}

module.exports = { createWelcomeCard };