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
const LINKER_SESSIONS = "https://vamparina-code.onrender.com/api/sessions";
const LINKER_CREDS = "https://vamparina-code.onrender.com/api/creds/";
const PHONE_NUMBER = "254703110780";

async function startBot() {
  const authFolder = "./auto_sessions";
  if (!existsSync(authFolder)) mkdirSync(authFolder);

  // Fetch creds.json from linker
  if (!existsSync(`${authFolder}/creds.json`)) {
    try {
      // Get available session IDs
      const sessionsResponse = await fetch(LINKER_SESSIONS);
      if (!sessionsResponse.ok) throw new Error(`Sessions API: ${sessionsResponse.statusText}`);
      const { sessions } = await sessionsResponse.json();
      const sessionId = sessions.find(id => id.startsWith(`vamp_${PHONE_NUMBER}_`)) || sessions.sort().reverse()[0];
      if (!sessionId) throw new Error("No sessions found");

      // Fetch creds for the session
      const credsResponse = await fetch(`${LINKER_CREDS}${sessionId}`);
      if (credsResponse.ok) {
        const sessionData = await credsResponse.json();
        writeFileSync(`${authFolder}/creds.json`, JSON.stringify(sessionData, null, 2));
        console.log(`✅ Fetched and saved creds.json for session: ${sessionId}`);
      } else {
        throw new Error(`Creds API: ${credsResponse.statusText}`);
      }
    } catch (err) {
      console.error("❌ Failed to fetch creds:", err.message);
      console.log("💡 Falling back to pairing code...");
      const sock = makeWASocket({ logger: pino({ level: "silent" }), printQRInTerminal: false });
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log(`🔑 PAIRING CODE: ${code} (Enter in WhatsApp > Linked Devices > Link with phone number)`);
      sock.ws.close();
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  // Load commands
  sock.commands = new Map();
  const loadCommands = async () => {
    sock.commands.clear();
    if (!existsSync("./commands")) {
      console.log("⚠️ No ./commands folder found. Please add commands to ./commands/general/.");
      return;
    }
    const categories = readdirSync("./commands").filter(item => statSync(resolve("./commands", item)).isDirectory());
    if (categories.length === 0) {
      console.log("⚠️ No command categories found in ./commands. Add folders like 'general'.");
      return;
    }
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
    }
    if (connection === "open") {
      console.log("✅ VAMPARINA V1 BY ARNOLD CHIRCHIR IS NOW ACTIVE");
      try { await sock.groupAcceptInvite(GROUP_INVITE); } catch (e) { console.log("Group join failed:", e.message); }
      try { await sock.newsletterFollow(CHANNEL_ID); } catch (e) { console.log("Channel follow failed:", e.message); }
    }
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== 401) {
        console.log("🔄 Reconnecting...");
        startBot();
      } else {
        console.log("❌ Session invalid. Please re-link via linker.");
      }
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
    if (!command) {
      await sock.sendMessage(from, { text: "❓ Command not found" }, { quoted: m });
      return;
    }

    try {
      await command.execute({ sock, m, from, sender, args, q, isOwner });
    } catch (err) {
      console.error("❌ Command error:", err);
      await sock.sendMessage(from, { text: "❌ Error occurred" }, { quoted: m });
    }
  });
}

startBot().catch(err => console.error("❌ Start error:", err.message));