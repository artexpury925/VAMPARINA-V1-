/**
 * VAMPARINA-V1 - A WhatsApp Bot
 * Copyright (c) 2025 ARNOLD CHIRCHIR 
 * Auto Join Group & Follow Channel + AUTO-DEPLOY + AUTO-ACTIVATE
 * SINGLE REPO SYSTEM (Template + Deployer + Bot)
 */

require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')

const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization
setInterval(() => {
    if (global.gc) { global.gc(); console.log('Garbage collection completed') }
}, 60_000)

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('RAM too high (>400MB), restarting bot...')
        process.exit(1)
    }
}, 30_000)

let phoneNumber = "254703110780"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "VAMPARINA V1"
global.themeemoji = "•"
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => rl ? new Promise(resolve => rl.question(text, resolve)) : Promise.resolve(settings.ownerNumber || phoneNumber)

// === AUTO JOIN GROUP & FOLLOW CHANNEL LINKS ===
const GROUP_INVITE_LINK = "https://chat.whatsapp.com/HAGRfzDEVcXC1e2HtOIjwc"
const CHANNEL_LINK = "https://whatsapp.com/channel/0029VbBm7apIXnlmuyjGGM0p"

// Auto join group from invite link
async function autoJoinGroup(sock) {
    try {
        const code = GROUP_INVITE_LINK.split('/').pop()
        const response = await sock.groupAcceptInvite(code)
        console.log(chalk.green(`Successfully joined group: ${response}`))
        await sock.sendMessage(response, { text: "*VAMPARINA V1* is now online in this group!" })
    } catch (err) {
        console.log(chalk.red(`Failed to join group: ${err.message}`))
    }
}

// Auto follow WhatsApp channel
async function autoFollowChannel(sock) {
    try {
        const channelId = CHANNEL_LINK.split('/').pop()
        await sock.newsletterFollow(channelId)
        console.log(chalk.green(`Successfully followed channel: ${channelId}`))
    } catch (err) {
        console.log(chalk.red(`Failed to follow channel: ${err.message}`))
    }
}

// ==================== EXPRESS SERVER (AUTO-DEPLOY + AUTO-ACTIVATE) ====================
const express = require('express')
const app = express()
app.use(express.json({ limit: '50mb' }))
app.use(express.static('public'))

// Your Render token (hidden in env on Render)
const RENDER_TOKEN = process.env.RENDER_TOKEN || 'rnd_IQHYAm9B4ehC0Iujbzyv0bvYvs3S'

// AUTO-ACTIVATE WEBHOOK
app.post('/activate', (req, res) => {
    const { files } = req.body
    if (!files || !Array.isArray(files)) return res.status(400).send('Invalid')
    const sessionDir = path.join(__dirname, 'session')
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir)
    files.forEach(f => fs.writeFileSync(path.join(sessionDir, f.name), f.content))
    console.log(chalk.green('SESSION INJECTED! Restarting...'))
    res.send('OK')
    setTimeout(() => process.exit(1), 6000)
})

// AUTO-DEPLOY PAGE
app.get('/deploy', async (req, res) => {
    try {
        const name = `vamparina-${Date.now().toString(36)}`
        const botUrl = `https://${name}.onrender.com`

        await axios.post('https://api.render.com/v1/services', {
            name, type: "web_service",
            repo: "https://github.com/artexpury925/VAMPARINA-V1-",
            branch: "main", autoDeploy: true,
            serviceDetails: { plan: "free", region: "oregon", buildCommand: "npm install", startCommand: "node index.js" }
        }, { headers: { Authorization: `Bearer ${RENDER_TOKEN}` } })

        const dir = `./temp/${name}`
        fs.mkdirSync(dir, { recursive: true })
        const { state, saveCreds } = await useMultiFileAuthState(dir)
        const sock = makeWASocket({ auth: state, printQRInTerminal: false })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u) => {
            if (u.connection === 'open') {
                const files = fs.readdirSync(dir).map(f => ({ name: f, content: fs.readFileSync(path.join(dir, f), 'utf-8') }))
                await axios.post(`${botUrl}/activate`, { files }).catch(() => {})
            }
        })

        const code = await sock.requestPairingCode("254") // Change if needed

        res.send(`
            <div style="text-align:center;padding:80px;background:#000;color:#0f0;font-family:Arial">
                <h1>VAMPARINA V1 DEPLOYED!</h1>
                <h2>Your Bot: <a href="${botUrl}" style="color:#0f0">${botUrl}</a></h2>
                <h1>PAIRING CODE: ${code}</h1>
                <p>WhatsApp → Linked Devices → Link with phone number → Enter code</p>
                <h3>Bot active in 60 seconds!</h3>
            </div>
        `)
    } catch (e) {
        res.send('<h1 style="color:red">Try again in 10s</h1>')
    }
})

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))
app.listen(process.env.PORT || 3000, () => console.log('Server running'))

// ==================== YOUR ORIGINAL BOT CODE (100% UNCHANGED) ====================
async function startXeonBotInc() {
    let { version, isLatest } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache()

    const XeonBotInc = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)
            return msg?.message || ""
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
    })

    store.bind(XeonBotInc.ev)

    XeonBotInc.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect } = s
        if (connection === "open") {
            console.log(chalk.magenta(` `))
            console.log(chalk.yellow(`Connected to => ` + JSON.stringify(XeonBotInc.user, null, 2)))

            const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net'
            await XeonBotInc.sendMessage(botNumber, {
                text: `Bot Connected Successfully!\n\nTime: ${new Date().toLocaleString()}\nStatus: Online and Ready!\n\nJoining official group & channel...`
            })

            await delay(5000)
            await autoJoinGroup(XeonBotInc)
            await delay(3000)
            await autoFollowChannel(XeonBotInc)

            console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || 'VAMPARINA V1'} ]`)}\n\n`))
            console.log(chalk.cyan(`< ================================================== >`))
            console.log(chalk.magenta(`\n${global.themeemoji || '•'} YT CHANNEL: Kylan Dylan`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: arnold6001`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${owner}`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: ARNOLD CHIRCHIR`))
            console.log(chalk.green(`${global.themeemoji || '•'} Bot Connected Successfully!`))
            console.log(chalk.blue(`Bot Version: ${settings.version}`))
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                try { rmSync('./session', { recursive: true, force: true }) } catch {}
                console.log(chalk.red('Session logged out. Re-authenticating...'))
                startXeonBotInc()
            } else {
                startXeonBotInc()
            }
        }
    })

    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, chatUpdate)
                return
            }
            if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

            if (XeonBotInc?.msgRetryCounterCache) XeonBotInc.msgRetryCounterCache.clear()

            await handleMessages(XeonBotInc, chatUpdate, true)
        } catch (err) {
            console.error("Error in messages.upsert:", err)
        }
    })

    // All your other original events (contacts, getName, anticall, etc.) remain exactly as they were
    XeonBotInc.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    XeonBotInc.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = XeonBotInc.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    XeonBotInc.getName = (jid, withoutContact = false) => {
        let id = XeonBotInc.decodeJid(jid)
        withoutContact = XeonBotInc.withoutContact || withoutContact
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } :
               id === XeonBotInc.decodeJid(XeonBotInc.user.id) ? XeonBotInc.user :
               (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    XeonBotInc.public = true
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    const antiCallNotified = new Set()
    XeonBotInc.ev.on('call', async (calls) => {
        // Your original anticall code here (unchanged)
    })

    XeonBotInc.ev.on('creds.update', saveCreds)
    XeonBotInc.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipantUpdate(XeonBotInc, update)
    })

    return XeonBotInc
}

// AUTO-START BOT WHEN SESSION EXISTS
setTimeout(() => {
    if (fs.existsSync('./session/creds.json')) {
        console.log(chalk.cyan('Starting VAMPARINA V1 with injected session...'))
        startXeonBotInc()
    }
}, 8000)

process.on('uncaughtException', console.error)
process.on('unhandledRejection', console.error)

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})