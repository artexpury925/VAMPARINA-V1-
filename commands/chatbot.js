// commands/chatbot.js — VAMPARINA V1 CHATBOT (2025 GOD MODE)
// OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
// SMART • SAVAGE • REMEMBERS • NEVER SLEEPS

const fs = require('fs')
const path = require('path')
const axios = require('axios')

const DATA_FILE = path.join(__dirname, '../data/chatbot.json')

// Load/Save chatbot settings
const loadData = () => {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE))
    } catch {
        return { enabled: {} } // { "groupid@g.us": true }
    }
}

const saveData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// In-memory user memory (resets on restart — perfect for Render)
const userMemory = new Map() // jid → { name, age, location, history: [] }

const KING_ARNOLD = "254703110780@s.whatsapp.net"

// Random delay + typing
const delay = (ms) => new Promise(res => setTimeout(res, ms))
const showTyping = async (sock, jid) => {
    await sock.presenceSubscribe(jid)
    await sock.sendPresenceUpdate('composing', jid)
    await delay(1500 + Math.random() * 2000)
}

// Extract user info from message
const extractInfo = (text) => {
    const info = {}
    const lower = text.toLowerCase()

    if (lower.includes('my name is') || lower.includes('call me')) {
        const match = text.match(/(?:my name is|call me)\s+([a-zA-Z]+)/i)
        if (match) info.name = match[1]
    }
    if (lower.includes('i am') && lower.includes('years old')) {
        const match = text.match(/i am (\d+) years? old/i)
        if (match) info.age = match[1]
    }
    if (lower.includes('i live in') || lower.includes('from')) {
        const match = text.match(/(?:i live in|i am from)\s+([a-zA-Z\s]+)/i)
        if (match) info.location = match[1].trim()
    }
    return info
}

// Get savage AI response using BLACKBOX AI + fallbacks
const getAIResponse = async (prompt) => {
    const apis = [
        `https://www.blackbox.ai/api/chat?prompt=${encodeURIComponent(prompt)}`,
        `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(prompt)}`,
        `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(prompt)}`,
        `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(prompt)}`
    ]

    for (const url of apis) {
        try {
            const res = await axios.get(url, { timeout: 12000 })
            const text = res.data?.response || res.data?.result || res.data?.message || res.data?.answer || res.data?.data
            if (text && text.trim()) return text.trim()
        } catch {}
    }
    return null
}

// MAIN COMMAND: .chatbot on/off
async function chatbotCommand(sock, from, msg, text) {
    const sender = msg.key.participant || msg.key.remoteJid
    const isKing = sender === KING_ARNOLD || msg.key.fromMe

    // Check if sender is admin (for groups)
    let isAdmin = isKing
    if (from.endsWith('@g.us')) {
        try {
            const meta = await sock.groupMetadata(from)
            isAdmin = isKing || meta.participants.some(p => p.id === sender && p.admin)
        } catch {}
    }

    if (!isAdmin) {
        return sock.sendMessage(from, { text: "Only *King Arnold* or group admins can control the chatbot." }, { quoted: msg })
    }

    const args = text.trim().toLowerCase()

    if (args === 'on' || args === 'enable') {
        const data = loadData()
        data.enabled[from] = true
        saveData(data)
        return sock.sendMessage(from, { text: "*CHATBOT ACTIVATED*\n\nI am now alive in this group.\nMention me or reply to wake me.\n\nLong live King Arnold" }, { quoted: msg })
    }

    if (args === 'off' || args === 'disable') {
        const data = loadData()
        delete data.enabled[from]
        saveData(data)
        return sock.sendMessage(from, { text: "*CHATBOT DEACTIVATED*\n\nI go back to sleep.\nUntil the King calls again." }, { quoted: msg })
    }

    // Help
    await sock.sendMessage(from, {
        text: `*VAMPARINA V1 CHATBOT*\n\n` +
              `.chatbot on  → Activate\n` +
              `.chatbot off → Deactivate\n\n` +
              `Only admins or King Arnold can control me.\n\n` +
              `Mention @${sock.user.id.split(':')[0]} or reply to talk.\n\n` +
              `I remember your name, age, location & past messages.\n\n` +
              `Long live the Empire.`
    }, { quoted: msg })
}

// MAIN RESPONSE HANDLER (called from main.js)
async function chatbotResponse(sock, msg) {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || msg.key.remoteJid
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim()

    const data = loadData()
    if (!data.enabled[from]) return // Chatbot off in this chat

    const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botNumber)
    const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === botNumber

    if (!isMentioned && !isReplyToBot) return

    // Clean message
    let cleanText = text
    if (isMentioned) {
        cleanText = text.replace(new RegExp(`@${sock.user.id.split(':')[0]}`), '').trim()
    }

    if (!cleanText) return

    // Update user memory
    if (!userMemory.has(sender)) {
        userMemory.set(sender, { history: [], name: null, age: null, location: null })
    }

    const memory = userMemory.get(sender)
    const info = extractInfo(cleanText)
    if (Object.keys(info).length > 0) {
        Object.assign(memory, info)
    }

    memory.history.push(`User: ${cleanText}`)
    if (memory.history.length > 15) memory.history.shift()

    await showTyping(sock, from)

    // Build personal context
    let context = `You are a real savage Kenyan WhatsApp user named "Vamparina". You speak Hinglish + Swahili slang. You are funny, rude when needed, and never robotic.\n\n`
    if (memory.name) context += `User's name: ${memory.name}\n`
    if (memory.age) context += `User is ${memory.age} years old\n`
    if (memory.location) context += `User lives in ${memory.location}\n`
    context += `\nPast messages:\n${memory.history.slice(-8).join('\n')}\n\nCurrent message: ${cleanText}\n\nReply naturally like a real person:`

    const aiReply = await getAIResponse(context)

    if (aiReply) {
        memory.history.push(`Vamparina: ${aiReply}`)
        await delay(1000 + Math.random() * 2000)
        await sock.sendMessage(from, { text: aiReply }, { quoted: msg })
    } else {
        await sock.sendMessage(from, { text: "Network slow hai yaar... thodi der baad bolna" }, { quoted: msg })
    }
}

module.exports = { chatbotCommand, chatbotResponse }