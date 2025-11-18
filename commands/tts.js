// commands/tts.js — VAMPARINA V1 TEXT-TO-SPEECH (2025)
// OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
// FAST • CLEAR • UNLIMITED • RENDER SAFE

const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

// List of supported languages (you can expand this)
const languages = {
    en: 'en-US',   // English
    es: 'es-ES',   // Spanish
    fr: 'fr-FR',   // French
    de: 'de-DE',   // German
    it: 'it-IT',   // Italian
    pt: 'pt-BR',   // Portuguese (Brazil)
    hi: 'hi-IN',   // Hindi
    ar: 'ar-SA',   // Arabic
    ru: 'ru-RU',   // Russian
    ja: 'ja-JP',   // Japanese
    ko: 'ko-KR',   // Korean
    zh: 'zh-CN',   // Chinese
    sw: 'sw-KE',   // Swahili (Kenya)
    tr: 'tr-TR',   // Turkish
    id: 'id-ID',   // Indonesian
}

// Main command
async function ttsCommand(sock, from, msg) {
    try {
        let text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim()

        // Remove command prefix (.tts, .say, etc.)
        text = text.replace(/^\.tts\s+/i, '').replace(/^\.say\s+/i, '').trim()

        if (!text) {
            return await sock.sendMessage(from, { 
                text: `*TEXT TO SPEECH — VAMPARINA V1*\n\n` +
                      `Usage:\n` +
                      `.tts Hello King Arnold\n` +
                      `.tts en Hello world\n` +
                      `.tts sw Habari zenu\n` +
                      `.tts fr Bonjour le monde\n\n` +
                      `Supported: en, sw, es, fr, de, hi, ar, ja, ko, zh, pt, it, ru, tr, id` 
            }, { quoted: msg })
        }

        // Extract language if provided (e.g., "en Hello")
        let langCode = 'en-US'
        const parts = text.trim().split(' ')
        const firstWord = parts[0].toLowerCase()

        if (firstWord.length === 2 || firstWord.length === 5) && languages[firstWord] 
            ? (langCode = languages[firstWord], text = parts.slice(1).join(' '))
            : null

        if (!text) {
            return await sock.sendMessage(from, { text: 'Please provide text after language code.' }, { quoted: msg })
        }

        await sock.sendMessage(from, { 
            text: 'Generating voice... Long live the King!' 
        }, { quoted: msg })

        // Google Translate TTS (works forever)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob&ttsspeed=1`

        const response = await fetch(url)
        if (!response.ok) throw new Error('TTS server busy')

        const buffer = await response.buffer()
        const fileName = `tts_${Date.now()}.mp3`
        const filePath = path.join(__dirname, '../temp', fileName)

        // Ensure temp folder exists
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true })
        }

        fs.writeFileSync(filePath, buffer)

        await sock.sendMessage(from, {
            audio: { url: filePath },
            mimetype: 'audio/mpeg',
            ptt: true  // Send as voice note (more natural)
        }, { quoted: msg })

        // Clean up
        setTimeout(() => {
            try { fs.unlinkSync(filePath) } catch {}
        }, 10000)

    } catch (error) {
        console.error("TTS ERROR:", error.message)
        await sock.sendMessage(from, { 
            text: `TTS Failed\n\nThe empire's voice is temporarily silent.\nTry again, soldier.` 
        }, { quoted: msg })
    }
}

module.exports = ttsCommand