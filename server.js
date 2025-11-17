const express = require('express');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const app = express();
const port = process.env.PORT || 3000;
const sessionsDir = './sessions';

app.use(express.json());
app.use(express.static('public')); // Serve static files (e.g., linking page)

// Ensure sessions directory exists
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

// Global map to hold active clients (phone -> client)
const clients = new Map();

// Function to create/start a client for a phone session
async function startClient(phone) {
  const sessionPath = path.join(sessionsDir, phone.replace(/[^a-z0-9]/gi, '_')); // Hash phone for folder name
  if (clients.has(phone)) {
    console.log(`🔄 Client for ${phone} already active.`);
    return;
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      generateHighQualityLinkPreview: true
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

    // Connection events
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        qrcode.generate(qr, { small: true });
        console.log(`📱 QR for ${phone}: Scan to link!`);
      }
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`🔌 ${phone} disconnected: ${lastDisconnect?.error}`);
        if (shouldReconnect) {
          startClient(phone); // Auto-reconnect
        }
      } else if (connection === 'open') {
        console.log(`✅ ${phone} connected! Bot active.`);
        // Optional: Send welcome message to self
        sock.sendMessage(phone + '@s.whatsapp.net', { text: '🤖 Vamparina Bot is now ACTIVE!' });
      }
    });

    // Message handler – PASTE YOUR FULL BOT CODE HERE
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === 'notify') {
        const from = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        console.log(`📩 Message from ${from}: ${text}`);
        
        // YOUR BOT LOGIC EXAMPLE (replace with your full code)
        if (text.toLowerCase() === 'hi') {
          await sock.sendMessage(from, { text: 'Hello! Vamparina Bot responding automatically.' });
        }
        // Add more handlers: commands, AI responses, etc.
      }
    });

    clients.set(phone, sock);
  } catch (error) {
    console.error(`❌ Error starting ${phone}:`, error);
  }
}

// Watch for new/updated session files (auto-activate)
const watcher = chokidar.watch(sessionsDir, { ignored: /^\./, persistent: true });
watcher.on('addDir', (dirPath) => {
  const phone = path.basename(dirPath).replace(/_/g, '+254'); // Reverse hash if needed
  console.log(`🆕 New session detected for ${phone}. Auto-starting bot...`);
  startClient(phone);
});

// API Endpoint: Simulate linking (integrate with your vamparina site logic)
app.post('/link', async (req, res) => {
  const { phone } = req.body; // e.g., { "phone": "+254703110780" }
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  console.log(`🔗 Linking ${phone}...`);
  await startClient(phone); // This generates QR/pair code in console (or send to site)

  // Simulate session creation (replace with actual file write from site)
  // In real: Site writes session files to this folder via shared storage or webhook
  setTimeout(() => {
    // Mock: Create a dummy session file to trigger watcher
    const sessionPath = path.join(sessionsDir, phone.replace(/[^a-z0-9]/gi, '_'), 'creds.json');
    if (!fs.existsSync(path.dirname(sessionPath))) fs.mkdirSync(path.dirname(sessionPath));
    fs.writeFileSync(sessionPath, JSON.stringify({ session: 'linked' })); // Trigger auto-activation
  }, 2000);

  res.json({ success: true, message: `Session started for ${phone}. Bot will auto-activate on link.` });
});

// Health check
app.get('/health', (req, res) => res.json({ activeSessions: clients.size }));

// Start all existing sessions on boot
fs.readdirSync(sessionsDir).forEach(folder => {
  if (fs.statSync(path.join(sessionsDir, folder)).isDirectory()) {
    const phone = folder.replace(/_/g, '+254');
    startClient(phone);
  }
});

app.listen(port, () => {
  console.log(`🚀 Bot server running on port ${port}. Sessions in ${sessionsDir}.`);
  console.log(`📱 Access linking at http://localhost:${port}/link (POST with {phone: '+254...'})`);
});