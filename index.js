import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import express from "express";
import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from "fs";
import { resolve } from "path";
import fetch from "node-fetch";

const app = express();
app.get("/", (req, res) => res.send("<h1>VAMPARINA V1 BY ARNOLD CHIRCHIR IS ALIVE</h1>"));
app.listen(process.env.PORT || 3000);

const OWNER = "254703110780@s.whatsapp.net";
const GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n";
const CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p@newsletter";
const LINKER_API = "https://vamparina-code.onrender.com/api/creds/vamp_254703110780_"; // Adjust session ID
const PHONE_NUMBER = "254703110780";

async function startBot() {
  const authFolder = "./auto_sessions";
  if (!existsSync(authFolder)) mkdirSync(authFolder);

  // Fetch creds.json from linker API
  if (!existsSync(`${authFolder}/creds.json`)) {
    try {
      // Generate a session ID (you may need to get the exact timestamp or ID)
      const sessionId = `vamp_${PHONE_NUMBER}_${Date.now()}`; // Example ID, adjust as needed
      const response = await fetch(`${LINKER_API}${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        writeFileSync(`${authFolder}/creds.json`, JSON.stringify(sessionData, null, 2));
        console.log("✅ Fetched and saved creds.json from linker API");
      } else {
        console.log("⚠️ Linker API returned:", response.statusText);
        console.log("💡 Falling back to pairing code...");
      }
    } catch (err) {
      console.error("❌ Failed to fetch creds:", err.message);
      console.log("💡 Falling back to pairing code...");
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  // Load commands (only directories)
  sock.commands = new Map();
  const loadCommands = async () => {
    sock.commands.clear();
    if (!existsSync("./commands")) {
      console.log("⚠️ No ./commands folder found.");
      return;
    }
    const categories = readdirSync("./commands").filter(item => statSync(resolve("./commands", item)).isDirectory());
    for (const category of categories) {
      const files = readdirSync(`./commands/${category}`).filter(f => f.endsWith(".js"));
      for (const file of files) {
        try {
          const cmd = await import(`./commands/${category}/${file}?${Date.now()}`);
          if (cmd.default?.name) {
            sock.commands.set(cmd.default.name.toLowerCase(), cmd.default);
          }
        } catch (e) {
          console.log(`❌ Failed to load ${category}/${file}:`, e.message);
        }
      }
    }
    console.log(`✅ Loaded ${sock.commands.size} commands`);
  };
  await loadCommands();

  // Connection handler
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("📱 Fallback QR:");
      qrcode.generate(qr, { small: true });
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log(`🔑 PAIRING CODE: ${code} (Enter in WhatsApp > Linked Devices > Link with phone number)`);
    }
    if (connection === "open") {
      console.log("✅ VAMPARINA V1 BY ARNOLD CHIRCHIR IS NOW ACTIVE");
      try { await sock.groupAcceptInvite(GROUP_INVITE); } catch {}
      try { await sock.newsletterFollow(CHANNEL_ID); } catch {}
    }
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== 401) startBot();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Message handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const from = m.key.remoteJid;
    const sender = m.key.participant || from;
    const isOwner = sender === OWNER;

    let text = "";
    const type = Object.keys(m.message)[0];
    if (type === "conversation") text = m.message.conversation;
    else if (type === "extendedTextMessage") text = m.message.extendedTextMessage.text;
    else if (m.message.imageMessage?.caption) text = m.message.imageMessage.caption;
    else if (m.message.videoMessage?.caption) text = m.message.videoMessage.caption;

    if (!text || text[0] !== ".") return;

    const body = text.slice(1).trim();
    const [cmdName, ...args] = body.split(/\s+/);
    const q = args.join(" ");

    const command = sock.commands.get(cmdName.toLowerCase());
    if (!command) return;

    try {
      await command.execute({ sock, m, from, sender, args, q, isOwner });
    } catch (err) {
      console.error("❌ Command error:", err);
      sock.sendMessage(from, { text: "❌ Error occurred" }, { quoted: m });
    }
  });
}

startBot().catch(console.error);