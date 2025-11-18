// commands/pair.js — VAMPARINA V1 PAIR CODE GENERATOR (2025)
// OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
// SELF-HOSTED • INSTANT • UNLIMITED • NEVER DIES

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    delay
} = require("@whiskeysockets/baileys")
const pino = require('pino')
const fs = require('fs')
const path = require('path')

// Temp folder for pairing sessions
const TEMP_PAIR_DIR = path.join(__dirname, '../temp_pair_sessions')
if (!fs.existsSync(TEMP_PAIR_DIR)) fs.mkdirSync(TEMP_PAIR_DIR, { recursive: true })

// Active pairing sessions (prevents duplicates)
const activePairs = new Set()

async function pairCommand(sock, from, msg, text) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid
        const isKing = sender.replace(/[^0-9]/g, '') === '254703110780'

        // Only King Arnold or sudo can use .pair
        const sudoList = global.sudoList || []
        const isSudo = sudoList.includes(sender)
        if (!isKing && !isSudo && !msg.key.fromMe) {
            return sock.sendMessage(from, { 
                text: "Only *King Arnold Chirchir* and his chosen warriors can generate pairing codes." 
            }, { quoted: msg })
        }

        let number = text.trim().replace(/[^0-9]/g, '')
        if (!number || number.length < 8) {
            return sock.sendMessage(from, {
                text: `*VAMPARINA V1 — PAIR CODE GENERATOR*\n\n` +
                      `Usage: .pair 254703110780\n\n` +
                      `Enter your number without + or spaces.\n` +
                      `Code will appear in 10 seconds.\n\n` +
                      `Long live the Empire.`
            }, { quoted: msg })
        }

        // Add country code if missing
        if (!number.startsWith('254') && number.length === 9) {
            number = '254' + number
        }

        const fullJid = number + '@s.whatsapp.net'

        // Check if number exists on WhatsApp
        const [result] = await sock.onWhatsApp(fullJid)
        if (!result?.exists) {
            return sock.sendMessage(from, { 
                text: `Number *${number}* is not registered on WhatsApp.` 
            }, { quoted: msg })
        }

        // Prevent spam
        if (activePairs.has(number)) {
            return sock.sendMessage(from, { 
                text: `Pairing code already being generated for *${number}*...\nPlease wait 30 seconds.` 
            }, { quoted: msg })
        }

        activePairs.add(number)

        await sock.sendMessage(from, { 
            text: `Generating pairing code for *${number}*...\n\nPlease wait 10-20 seconds.` 
        }, { quoted: msg })

        const sessionId = `pair_${number}_${Date.now()}`
        const sessionPath = path.join(TEMP_PAIR_DIR, sessionId)
        fs.mkdirSync(sessionPath, { recursive: true })

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

        const tempSock = makeWASocket({
            version,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Chrome')
        })

        let code = null

        tempSock.ev.on('connection.update', async (update) => {
            if (update.connection === 'open') {
                // Already connected (rare)
                fs.rmSync(sessionPath, { recursive: true, force: true })
                activePairs.delete(number)
            }
        })

        if (!tempSock.authState.creds.registered) {
            await delay(3000)
            try {
                code = await tempSock.requestPairingCode(number)
                code = code.match(/.{1,4}/g).join('-')

                await sock.sendMessage(from, {
                    text: `*PAIR CODE GENERATED SUCCESSFULLY*\n\n` +
                          `Number: ${number}\n` +
                          `Code: *${code}*\n\n` +
                          `Open WhatsApp → Linked Devices → Link with phone number → Enter code\n\n` +
                          `You now have 60 seconds to use it.\n\n` +
                          `*VAMPARINA V1 EMPIRE — BY KING ARNOLD CHIRCHIR*\n` +
                          `+254703110780 = GOD OF WHATSAPP`
                }, { quoted: msg })

                // Auto cleanup after 2 minutes
                setTimeout(() => {
                    try { fs.rmSync(sessionPath, { recursive: true, force: true }) } catch {}
                    activePairs.delete(number)
                }, 120000)

            } catch (err) {
                console.error("PAIR CODE ERROR:", err.message)
                await sock.sendMessage(from, { 
                    text: `Failed to generate code for ${number}\n\nError: ${err.message}\n\nTry again in 1 minute.` 
                }, { quoted: msg })
                activePairs.delete(number)
            }
        }

        tempSock.ev.on('creds.update', saveCreds)

    } catch (error) {
        console.error("PAIR COMMAND ERROR:", error)
        activePairs.delete(text?.trim()?.replace(/[^0-9]/g, '') || 'unknown')
        await sock.sendMessage(from, { 
            text: `PAIR SYSTEM ERROR\n\nThe empire's pairing system is temporarily overwhelmed.\nTry again in 30 seconds.` 
        }, { quoted: msg })
    }
}

module.exports = pairCommand