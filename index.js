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
const LINKER_URL = "https://vamparina-code.onrender.com";
const PHONE_NUMBER = "254703110780"; // For fallback pairing

async function startBot() {
  const authFolder = "./auto_sessions";
  if (!existsSync(authFolder)) mkdirSync(authFolder);

  // === FETCH CREDS FROM YOUR LINKER URL ===
  if (!existsSync(`${authFolder}/creds.json`)) {
    try {
      const response = await fetch(LINKER_URL);
      const text = await response.text();

      // Try to parse as JSON
      let sessionData;
      try {
        sessionData = JSON.parse(text);
        writeFileSync(`${authFolder}/creds.json`, JSON.stringify(sessionData, null, 2));
        console.log("✅ Creds.json fetched and saved from linker");
      } catch (e) {
        console.log("⚠️ Linker returned non-JSON. Raw response:", text.slice(0, 200) + "...");
        console.log("💡 Falling back to pairing code.");
      }
    } catch (err) {
      console.error("❌ Failed to fetch from linker:", err.message);
      console.log("💡 Falling back to pairing code.");
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  // === LOAD COMMANDS — FIXED: ONLY DIRECTORIES ===
  sock.commands = new Map();
  const loadCommands = async () => {
    sock.commands.clear();
    if (!existsSync("./commands")) {
      console.log("⚠️ No ./commands folder found.");
      return;
    }

    const items = readdirSync("./commands");
    for (const item of items) {
      const fullPath = resolve("./commands", item);
      if (!statSync(fullPath).isDirectory()) continue; // Skip files like 'M'

      const files = readdirSync(fullPath).filter(f => f.endsWith(".js"));
      for (const file of files) {
        try {
          const cmd = await import(`./commands/${item}/${file}?${Date.now()}`);
          if (cmd.default?.name) {
            sock.commands.set(cmd.default.name.toLowerCase(), cmd.default);
          }
        } catch (e) {
          console.log(`❌ Failed to load ${item}/${file}:`, e.message);
        }
      }
    }
    console.log(`✅ Loaded ${sock.commands.size} commands`);
  };

  await loadCommands();

  // === CONNECTION HANDLER ===
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("📱 QR Code (fallback):");
      qrcode.generate(qr, { small: true });
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log(`🔑 PAIRING CODE: ${code}`);
    }
    if (connection === "open") {
      console.log("✅ VAMPARINA V1 BY ARNOLD CHIRCHIR IS NOW ACTIVE");

      try { await sock.groupAcceptInvite(GROUP_INVITE); } catch (e) {}
      try { await sock.newsletterFollow(CHANNEL_ID); } catch (e) {}
    }
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== 401) startBot();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // === MESSAGE HANDLER (RESPOND TO COMMANDS) ===
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