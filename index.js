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
const PHONE_NUMBER = "254703110780";  // Your number for fallback pairing code

async function startBot() {
  const authFolder = "./auto_sessions";
  if (!existsSync(authFolder)) mkdirSync(authFolder);

  // Fetch creds from URL
  if (!existsSync(`${authFolder}/creds.json`)) {
    try {
      const response = await fetch(SESSION_URL);
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      if (contentType.includes("json")) {
        // Parse and save if JSON
        const sessionData = JSON.parse(text);
        writeFileSync(`${authFolder}/creds.json`, JSON.stringify(sessionData, null, 2));
        console.log("Creds.json fetched and saved from URL");
      } else {
        // If not JSON (e.g., HTML), log for debug and fallback to pairing
        console.log("Fetched content is not JSON. Raw content:", text);
        console.log("Falling back to generating pairing code...");
      }
    } catch (err) {
      console.error("Failed to fetch creds from URL:", err);
      console.log("Falling back to generating pairing code...");
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  // Load commands from /commands folder (FIXED: only scan directories)
  sock.commands = new Map();
  const loadCommands = async () => {
    sock.commands.clear();
    const categories = readdirSync("./commands").filter(f => statSync(`./commands/${f}`).isDirectory());
    for (const category of categories) {
      const files = readdirSync(`./commands/${category}`).filter(f => f.endsWith(".js"));
      for (const file of files) {
        try {
          const cmd = await import(`./commands/${category}/${file}?${Date.now()}`);
          if (cmd.default?.name) {
            sock.commands.set(cmd.default.name.toLowerCase(), cmd.default);
          }
        } catch (e) {
          console.log(`Failed to load ${file}:`, e);
        }
      }
    }
    console.log(`Loaded ${sock.commands.size} commands`);
  };
  await loadCommands();

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("Fallback QR (if session invalid):");
      qrcode.generate(qr, { small: true });
      // Generate pairing code as additional fallback
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log(`PAIRING CODE: ${code} (Enter on WhatsApp app: Linked Devices > Link with phone number)`);
    }
    if (connection === "open") {
      console.log("VAMPARINA V1 BY ARNOLD CHIRCHIR IS NOW ACTIVE");

      try { await sock.groupAcceptInvite(GROUP_INVITE); } catch {}
      try { await sock.newsletterFollow(CHANNEL_ID); } catch {}
    }
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== 401) startBot();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Message Handler (Responds to commands)
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

    const prefix = text[0] === "." ? "." : null;
    if (!prefix) return;

    const body = text.slice(prefix.length).trim();
    const [cmdName, ...args] = body.split(" ");
    const q = args.join(" ");

    const command = sock.commands.get(cmdName.toLowerCase());
    if (!command) return;

    try {
      await command.execute({ sock, m, from, sender, args, q, isOwner });
    } catch (err) {
      console.error("Command error:", err);
      sock.sendMessage(from, { text: "❌ Error occurred" }, { quoted: m });
    }
  });
}

startBot().catch(console.error);