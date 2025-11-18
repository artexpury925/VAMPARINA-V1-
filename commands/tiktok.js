// commands/tiktok.js — VAMPARINA V1 TIKTOK COMMAND (2025)
// OWNER: KING ARNOLD CHIRCHIR (+254703110780)

const Tiktok = require('@xct007/tiktok-scraper')

module.exports = async (sock, from, msg) => {
    try {
        const args = msg.message?.conversation?.slice(7).trim() || // .tiktok <url>
                     msg.message?.extendedTextMessage?.text?.slice(7).trim() ||
                     ''
        
        if (!args) {
            return await sock.sendMessage(from, { text: 'Usage: .tiktok <video_url>' })
        }

        // Validate URL
        if (!args.includes('tiktok.com')) {
            return await sock.sendMessage(from, { text: 'Please provide a valid TikTok video URL' })
        }

        // Download TikTok video
        await sock.sendMessage(from, { text: 'Downloading TikTok video, please wait...' })
        const data = await Tiktok(args, { parse: true })

        if (!data?.video?.url) {
            return await sock.sendMessage(from, { text: 'Failed to download TikTok video. Try another URL.' })
        }

        // Send video
        await sock.sendMessage(from, {
            video: { url: data.video.url },
            caption: `Vamparina V1 TikTok\nDownloaded by King Arnold (+254703110780)`
        })

    } catch (err) {
        console.error('TikTok Error:', err.message)
        await sock.sendMessage(from, { text: 'Error downloading TikTok video. Try again later.' })
    }
}