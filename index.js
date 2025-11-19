// index.js - VAMPARINA V1 WhatsApp Bot
// Author: Arnold Chirchir
// Phone: +254703110780
// Group: https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n
// Channel: https://whatsapp.com/channel/0029VbBm7apIXnlmuyjGGM0p
// Linker: https://vamparina-code.onrender.com

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// 👇 SESSION FOLDER PATH - Points to your existing auto_sessions folder
const SESSION_FOLDER_PATH = './auto_sessions'; // <-- Your existing folder!

// ✅ Ensure the auto_sessions folder exists (creates if missing)
if (!fs.existsSync(SESSION_FOLDER_PATH)) {
    fs.mkdirSync(SESSION_FOLDER_PATH, { recursive: true });
}

// ✅ Initialize WhatsApp Client with LocalAuth using your auto_sessions folder
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: SESSION_FOLDER_PATH  // ← This line loads sessions automatically!
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Helps on low-memory Render instances
            '--disable-gpu'
        ]
    },
    sessionTimeout: 60, // Auto-reconnect after 60 seconds if disconnected
});

// ✅ QR Code Event - Only shows if no session exists
client.on('qr', (qr) => {
    console.log('🔐 VAMPARINA V1: QR Code Generated. Scan with WhatsApp > Linked Devices');
    qrcode.generate(qr, { small: true });
});

// ✅ Authenticated Event - Session loaded or QR scanned
client.on('authenticated', () => {
    console.log('✅ VAMPARINA V1: Authenticated successfully!');
});

// ✅ Ready Event - Bot is fully active and listening
client.on('ready', () => {
    console.log('🚀 VAMPARINA V1: Ready and Active!');
    console.log('📱 Phone Number:', client.info.wid.user);
    console.log('👥 Group Link:', 'https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n');
    console.log('📢 Channel:', 'https://whatsapp.com/channel/0029VbBm7apIXnlmuyjGGM0p');
    console.log('🔗 Linker:', 'https://vamparina-code.onrender.com');
    console.log('====================================');
});

// ✅ Message Event - Your bot logic (add your commands here)
client.on('message', async (msg) => {
    const from = msg.from;
    const text = msg.body.toLowerCase();

    // Example: Reply to 'hello'
    if (text === 'hello' || text === 'hi') {
        await msg.reply('Hello! I am VAMPARINA V1 👻');
    }

    // Example: Reply to 'ping'
    if (text === '!ping') {
        await msg.reply('Pong! 🏓');
    }

    // Add more commands as needed...
});

// ✅ Disconnected Event - Auto-reconnect
client.on('disconnected', (reason) => {
    console.log('❌ VAMPARINA V1: Disconnected. Reason:', reason);
    console.log('🔁 Reconnecting...');
    client.initialize(); // Auto-restart
});

// ✅ Auth Failure - Session might be invalid
client.on('auth_failure', (msg) => {
    console.error('🔒 VAMPARINA V1: Authentication failed:', msg);
});

// ✅ Start the client
client.initialize();

// ✅ Graceful shutdown on process exit (important for Render)
process.on('SIGINT', async () => {
    console.log('🛑 VAMPARINA V1: Shutting down...');
    await client.destroy();
    process.exit(0);
});

console.log('🌙 VAMPARINA V1: Bot started. Waiting for connection...');