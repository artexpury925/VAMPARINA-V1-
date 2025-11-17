/**
 * VAMPARINA-V1 - A WhatsApp Bot
 * Copyright (c) 2025 ARNOLD CHIRCHIR 
 * Auto Join Group & Follow Channel + AUTO-ACTIVATE ON SESSION INJECTION
 */

require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const { rmSync, existsSync } = require('fs')
const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// ==================== AUTO-ACTIVATE WEBHOOK (TOP PRIORITY) ====================
const express = require('express')
const app = express()
app.use(express.json({ limit: '50mb' }))

app.get('/', (req, res) => res.send('<h1>VAMPARINA V1 BOT IS ALIVE</h1>'))

app.post('/activate', async (req, res) => {
    const { files } = req.body
    if (!files || !Array.isArray(files)) return res.status(400).send('Invalid payload')

    const sessionDir = path.join(__dirname, 'session')
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir)

    files.forEach(f => {
        fs.writeFileSync(path.join(sessionDir, f.name), f.content)
    })

    console.log(chalk.green('SESSION INJECTED! Bot will connect in 5 seconds...'))
    res.send('OK')

    setTimeout(() => process.exit(1), 5000) // Render auto-restarts → bot connects
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`))
// ===========================================================================

// Memory optimization
setInterval(() => global.gc?.(), 60_000)
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) process.exit(1)
}, 30_000)

global.botname = "VAMPARINA V1"
global.themeemoji = "•"

const GROUP_INVITE_LINK = "https://chat.whatsapp.com/HAGRfzDEVcXC1e2HtOIjwc"
const CHANNEL_LINK = "https://whatsapp.com/channel/0029VbBm7apIXnlmuyjGGM0p"

async function autoJoinGroup(sock) {
    try {
        const code = GROUP_INVITE_LINK.split('/').pop()
        const gid = await sock.groupAcceptInvite(code)
        await sock.sendMessage(gid, { text: "VAMPARINA V1 is now online!" })
        console.log(chalk.green('Joined group successfully'))
    } catch (e) { console.log(chalk.red('Group join failed:', e.message)) }
}

async function autoFollowChannel(sock) {
    try {
        const cid = CHANNEL_LINK.split('/').pop()
        await sock.newsletterFollow(cid)
        console.log(chalk.green('Followed channel'))
    } catch (e) { console.log(chalk.red('Channel follow failed:', e.message)) }
}

async function startBot() {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const msgRetryCounterCache = new NodeCache()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })) },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        msgRetryCounterCache,
    })

    store.bind(sock.ev)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') {
            console.log(chalk.cyan('BOT CONNECTED & FULLY ACTIVE!'))
            await delay(5000); await autoJoinGroup(sock)
            await delay(3000); await autoFollowChannel(sock)
        }
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            startBot()
        }
    })

    sock.ev.on('messages.upsert', async m => {
        try {
            const mek = m.messages[0]
            if (!mek.message) return
            mek.message = Object.keys(mek.message)[0] === 'ephemeralMessage' ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key?.remoteJid === 'status@broadcast') return handleStatus(sock, m)
            if (!sock.public && !mek.key.fromMe) return
            if (mek.key.id.startsWith('BAE5')) return
            await handleMessages(sock, m, true)
        } catch (e) { console.error(e) }
    })

    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('group-participants.update', (update) => handleGroupParticipantUpdate(sock, update))
    sock.public = true

    return sock
}

// AUTO-START WHEN SESSION IS INJECTED
setTimeout(() => {
    if (fs.existsSync('./session/creds.json')) {
        console.log(chalk.magenta('Session found → Starting VAMPARINA V1...'))
        startBot()
    }
}, 8000)

process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)