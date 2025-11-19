import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import express from "express";
import { readdirSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const app = express();
app.get("/", (req, res) => res.send("<h1>VAMPARINA V1 BY ARNOLD CHIRCHIR IS ALIVE</h1>"));
app.listen(process.env.PORT || 3000);

const OWNER = "254703110780@s.whatsapp.net";
const GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n";
const CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p@newsletter";
const PHONE_NUMBER = "254703110780";  // Your phone number without + (for pairing code)

async function startBot() {
  const authFolder = "./auto_sessions";
  if (!existsSync(authFolder)) mkdirSync(authFolder);

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  // Generate pairing code if no session (instead of QR or fetch)
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      // Ignore QR, generate pairing code instead
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log(`PAIRING CODE: ${code} (Enter this on your phone's WhatsApp > Linked Devices > Link with phone number)`);
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

  // Load commands from /commands folder
  sock.commands = new Map();
  const loadCommands = async () => {
    sock.commands.clear();
    const categories = readdirSync("./commands");
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

    const prefix = text[0] === "." ? "." : null;  // Use . as prefix
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