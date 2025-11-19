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
const SESSION_URL = "https://vamparina-code.onrender.com";
const PHONE_NUMBER = "254703110780";

async function startBot() {
  const authFolder = "./auto_sessions";
  if (!existsSync(authFolder)) mkdirSync(authFolder);

  // Fetch creds from URL
  if (!existsSync(`${authFolder}/creds.json`)) {
    try {
      const response = await fetch(SESSION_URL);
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        writeFileSync(`${authFolder}/creds.json`, JSON.stringify(json, null, 2));
        console.log("✅ Creds.json fetched and saved from URL");
      } catch (e) {
        console.log("⚠️ URL returned non-JSON. Raw response:", text.slice(0, 200) + "...");
        console.log("💡 Falling back to pairing code method.");
      }
    } catch (err) {
      console.error("❌ Failed to fetch from URL:", err.message);
      console.log("💡 Falling back to pairing code method.");
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  // === LOAD COMMANDS - FIXED: Only scan directories ===
  sock.commands = new Map();
  const loadCommands = async () => {
    sock.commands.clear();
    if (!existsSync("./commands")) {
      console.log("⚠️ No ./commands folder found. Skipping command load.");
      return;
    }

    const categories = readdirSync("./commands").filter(item => {
      const fullPath = resolve("./commands", item);
      return statSync(fullPath).isDirectory(); // Only include directories
    });

    if (categories.length === 0) {
      console.log("⚠️ No command categories found in ./commands");
      return;
    }

    for (const category of categories) {
      try {
        const files = readdirSync(`./commands/${category}`).filter(f => f.endsWith(".js"));
        for (const file of files) {
          try {
            const cmd = await import(`./commands/${category}/${file}?${Date.now()}`);
            if (cmd.default?.name) {
              sock.commands.set(cmd.default.name.toLowerCase(), cmd.default);
            }
          } catch (e) {
            console.log(`❌ Failed to load ${file}:`, e.message);
          }
        }
      } catch (e) {
        console.log(`❌ Invalid category folder: ${category}`, e.message);
      }
    }
    console.log(`✅ Loaded ${sock.commands.size} commands`);
  };

  await loadCommands();

  // Connection events
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("📱 Fallback QR Code:");
      qrcode.generate(qr, { small: true });
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log(`🔑 PAIRING CODE: ${code} (Enter in WhatsApp > Linked Devices > Link with phone number)`);
    }
    if (connection === "open") {
      console.log("✅ VAMPARINA V1 BY ARNOLD CHIRCHIR IS NOW ACTIVE");

      try { await sock.groupAcceptInvite(GROUP_INVITE); } catch (e) { console.log("Group join failed:", e.message); }
      try { await sock.newsletterFollow(CHANNEL_ID); } catch (e) { console.log("Channel follow failed:", e.message); }
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

    if (!text) return;

    if (text[0] !== ".") return; // Only respond to . commands

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