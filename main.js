// main.js — VAMPARINA V1 FULL COMMAND HANDLER (2025 EDITION — KING ARNOLD EDITION)
// OWNER: KING ARNOLD CHIRCHIR (+254703110780) — UNDEFEATED

const fs = require('fs')
const path = require('path')
const { jidNormalizedUser } = require('@whiskeysockets/baileys')

// Import your commands and libs
const settings = require('./settings')
const { isBanned } = require('./lib/isBanned')
const isAdmin = require('./lib/isAdmin')

// Your command files
const tagAllCommand = require('./commands/tagall')
const helpCommand = require('./commands/help')
const banCommand = require('./commands/ban')
const kickCommand = require('./commands/kick')
const stickerCommand = require('./commands/sticker')
const playCommand = require('./commands/play')
const songCommand = require('./commands/song')
const videoCommand = require('./commands/video')
const aiCommand = require('./commands/ai')
const tiktokCommand = require('./commands/tiktok')
const instagramCommand = require('./commands/instagram')
const facebookCommand = require('./commands/facebook')
const pingCommand = require('./commands/ping')
const aliveCommand = require('./commands/alive')
const ownerCommand = require('./commands/owner')
const { handleChatbotResponse } = require('./commands/chatbot')

// GLOBAL CONFIG
global.packname = settings.packname || "Vamparina V1"
global.author = settings.author || "King Arnold"

// SUDO SYSTEM — NEVER LOSES LIST
const SUDO_FILE = path.join(__dirname, 'data', 'sudo.json')

global.getSudoList = () => {
    try {
        if (fs.existsSync(SUDO_FILE)) {
            return JSON.parse(fs.readFileSync(SUDO_FILE))
        }
    } catch {}
    return ["254703110780@s.whatsapp.net"] // King Arnold always sudo
}

global.saveSudoList = (list) => {
    fs.writeFileSync(SUDO_FILE, JSON.stringify(list, null, 2))
}

global.isSudo = (jid) => {
    return global.getSudoList().includes(jidNormalizedUser(jid))
}

// BOT MODE SYSTEM (PUBLIC / PRIVATE)
const MODE_FILE = path.join(__dirname, 'data', 'messageCount.json')

global.getBotMode = () => {
    try {
        const data = JSON.parse(fs.readFileSync(MODE_FILE))
        return data.isPublic ? 'public' : 'private'
    } catch {
        return 'public' // Default = PUBLIC (everyone can use)
    }
}

global.setBotMode = (mode) => {
    try {
        let data = { isPublic: mode === 'public' }
        if (fs.existsSync(MODE_FILE)) {
            data = { ...JSON.parse(fs.readFileSync(MODE_FILE)), isPublic: mode === 'public' }
        }
        fs.writeFileSync(MODE_FILE, JSON.stringify(data, null, 2))
    } catch (e) {
        console.log("Failed to save mode:", e.message)
    }
}

// MAIN MESSAGE HANDLER
async function handleMessages(sock, m) {
    try {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const sender = jidNormalizedUser(msg.key.participant || from)
        const isGroup = from.endsWith('@g.us')
        const body = (msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text ||
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption || '').trim()

        const isOwner = sender.includes("254703110780") // KING ARNOLD
        const isSudoUser = global.isSudo(sender)

        // PRIVATE MODE BLOCK
        if (global.getBotMode() === 'private' && !isOwner && !isSudoUser) return

        // BANNED USER BLOCK
        if (isBanned(sender) && !body.startsWith('.unban')) return

        // NO COMMAND → CHATBOT
        if (!body.startsWith('.')) {
            if (isGroup) await handleChatbotResponse(sock, from, msg, body, sender)
            return
        }

        const args = body.slice(1).trim().split(/ +/)
        const cmd = args.shift().toLowerCase()

        // COMMAND ROUTER
        switch (cmd) {
            case 'menu':
            case 'help':
                await helpCommand(sock, from, msg)
                break

            case 'ping':
                await pingCommand(sock, from, msg)
                break

            case 'alive':
                await aliveCommand(sock, from, msg)
                break

            case 'owner':
                await ownerCommand(sock, from)
                break

            case 'play':
            case 'song':
            case 'music':
                await songCommand(sock, from, msg)
                break

            case 'video':
            case 'ytmp4':
                await videoCommand(sock, from, msg)
                break

            case 'ai':
            case 'gpt':
            case 'gemini':
                await aiCommand(sock, from, msg)
                break

            case 'tiktok':
            case 'tt':
                await tiktokCommand(sock, from, msg)
                break

            case 'instagram':
            case 'ig':
                await instagramCommand(sock, from, msg)
                break

            case 'facebook':
            case 'fb':
                await facebookCommand(sock, from, msg)
                break

            case 'sticker':
            case 's':
                await stickerCommand(sock, from, msg)
                break

            case 'tagall':
                if (isGroup) await tagAllCommand(sock, from, sender, msg)
                break

            case 'kick':
                if (isGroup) await kickCommand(sock, from, sender, msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [], msg)
                break

            case 'ban':
                await banCommand(sock, from, msg)
                break

            // SUDOADD — ONLY KING ARNOLD CAN USE
            case 'sudoadd':
                if (!isOwner) return sock.sendMessage(from, { text: "Only *KING ARNOLD* can add sudo!" })
                const target = args[0]?.replace(/[^0-9]/g, '')
                if (!target) return sock.sendMessage(from, { text: "Use: .sudoadd 254xxx" })
                const sudoJid = `${target}@s.whatsapp.net`
                const sudoList = global.getSudoList()
                if (sudoList.includes(sudoJid)) {
                    return sock.sendMessage(from, { text: `${target} is already sudo` })
                }
                sudoList.push(sudoJid)
                global.saveSudoList(sudoList)
                await sock.sendMessage(from, { text: `${target} is now SUDO` })
                break

            // SUDOLIST
            case 'sudolist':
                if (!isOwner && !isSudoUser) return
                const list = global.getSudoList().map(j => j.split('@')[0]).join('\n')
                await sock.sendMessage(from, { text: `*SUDO USERS:*\n${list}` })
                break

            // MODE CHANGE — ONLY OWNER
            case 'mode':
                if (!isOwner) return sock.sendMessage(from, { text: "Only *KING ARNOLD* can change mode!" })
                const newMode = args[0]?.toLowerCase()
                if (newMode === 'public' || newMode === 'private') {
                    global.setBotMode(newMode)
                    await sock.sendMessage(from, { text: `Bot is now *${newMode.toUpperCase()}* mode` })
                } else {
                    await sock.sendMessage(from, { text: "Use: .mode public  or  .mode private" })
                }
                break
        }

    } catch (err) {
        console.error("Error in main.js:", err.message)
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    // Your welcome/goodbye here if you want
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate
}