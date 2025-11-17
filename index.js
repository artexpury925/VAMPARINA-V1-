/**
 * VAMPARINA-V1 - Auto Deploy + Auto Activate Bot
 * Copyright (c) 2025 ARNOLD CHIRCHIR
 * One repo does everything
 */

require('./settings')
const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { Boom } = require('@hapi/boom')
const chalk = require('chalk')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main')
const { smsg } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    delay
} = require("@whiskeysockets/baileys")

const app = express()
app.use(express.json({ limit: '50mb' }))
app.use(express.static('public'))

// YOUR RENDER TOKEN (will be hidden in env later)
const RENDER_TOKEN = process.env.RENDER_TOKEN || 'rnd_IQHYAm9B4ehC0Iujbzyv0bvYvs3S'

global.botname = "VAMPARINA V1"
global.themeemoji = "•"

// ========== AUTO-ACTIVATE WEBHOOK ==========
app.post('/activate', (req, res) => {
    const { files } = req.body
    if (!files || !Array.isArray(files)) return res.status(400).send('Invalid')

    const sessionDir = path.join(__dirname, 'session')
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir)

    files.forEach(f => fs.writeFileSync(path.join(sessionDir, f.name), f.content))

    console.log(chalk.green('SESSION INJECTED! Restarting bot...'))
    res.send('OK')
    setTimeout(() => process.exit(1), 5000)
})

// ========== AUTO-DEPLOY MAGIC PAGE ==========
app.get('/deploy', async (req, res) => {
    try {
        const name = `vamp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`
        const botUrl = `https://${name}.onrender.com`

        // Create new bot instance
        await axios.post('https://api.render.com/v1/services', {
            name, type: "web_service",
            repo: "https://github.com/artexpury925/VAMPARINA-V1-",
            branch: "main", autoDeploy: true,
            serviceDetails: { plan: "free", region: "oregon", buildCommand: "npm install", startCommand: "node index.js" }
        }, { headers: { Authorization: `Bearer ${RENDER_TOKEN}` } })

        // Generate pairing code
        const dir = `./temp/${name}`
        fs.mkdirSync(dir, { recursive: true })
        const { state, saveCreds } = await useMultiFileAuthState(dir)
        const sock = makeWASocket({ auth: state, printQRInTerminal: false })
        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('connection.update', async (u) => {
            if (u.connection === 'open') {
                const files = fs.readdirSync(dir).map(f => ({
                    name: f,
                    content: fs.readFileSync(path.join(dir, f), 'utf-8')
                }))
                await axios.post(`${botUrl}/activate`, { files }).catch(() => {})
            }
        })

        const code = await sock.requestPairingCode("254") // Change country code if needed

        res.send(`
            <div style="text-align:center;padding:80px;background:#000;color:#0f0;font-family:Arial">
                <h1>VAMPARINA V1 DEPLOYED!</h1>
                <h2>Your Bot: <a href="${botUrl}" style="color:#0f0">${botUrl}</a></h2>
                <h1>PAIRING CODE: <br>${code}</h1>
                <p>Go to WhatsApp → Linked Devices → Link with phone number → Enter code</p>
                <h3>Bot will be 100% active in 60 seconds!</h3>
            </div>
        `)
    } catch (e) {
        res.send('<h1 style="color:red">Try again in 10 seconds</h1>')
    }
})

// ========== HOME PAGE ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))
app.get('/health', (req, res) => res.send('Bot Alive'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Magic server running on port ${PORT}`))

// ========== START BOT WHEN SESSION EXISTS ==========
setTimeout(() => {
    if (fs.existsSync('./session/creds.json')) {
        console.log(chalk.cyan('Starting VAMPARINA V1 with session...'))
        startBot()
    }
}, 8000)

// ========== YOUR FULL BOT CODE (UNCHANGED) ==========
async function startBot() {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('./session')

    const sock = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: state,
        logger: require('pino')({ level: 'silent' })
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'open') console.log(chalk.green('BOT CONNECTED!'))
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot()
    })

    sock.ev.on('messages.upsert', async m => {
        try {
            const msg = m.messages[0]
            if (!msg.message) return
            await handleMessages(sock, m, true)
        } catch (e) { console.error(e) }
    })

    sock.ev.on('creds.update', saveCreds)
    sock.public = true
}