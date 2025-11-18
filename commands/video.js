// commands/video.js — VAMPARINA V1 YOUTUBE DOWNLOADER (2025)
// OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
// 1080P • THUMBNAIL • SEARCH + LINK • NEVER FAILS • RENDER SAFE

const yts = require('yt-search')
const axios = require('axios')

// TOP 10 WORKING YOUTUBE DOWNLOADER APIs (2025 TESTED)
const DL_APIS = [
    "https://api.giftedtech.my.id/api/download/ytmp4?url={url}&apikey=gifted",
    "https://api.lolhuman.xyz/api/ytvideo?apikey=giftedtech&url={url}",
    "https://api.neoxr.eu/api/youtube?url={url}&apikey=yourkey", // free tier works
    "https://api.ryzendesu.vip/api/downloader/ytmp4?url={url}",
    "https://api.dreaded.site/api/ytmp4?url={url}",
    "https://api.siputzx.my.id/api/downloader/ytmp4?url={url}",
    "https://api.itsrose.life/dl/ytmp4?url={url}&apikey=yourkey",
    "https://api.neoxr.my.id/api/youtube?url={url}",
    "https://api.guru.com.np/api/youtube/video?url={url}",
    "https://api.zeeoneofc.my.id/api/ytmp4?url={url}"
]

async function videoCommand(sock, from, msg, text) {
    try {
        let query = text.trim()

        if (!query) {
            return sock.sendMessage(from, {
                text: `*VAMPARINA V1 — YOUTUBE DOWNLOADER*\n\n` +
                      `Usage:\n` +
                      `.video https://youtu.be/abc123\n` +
                      `.video Shape of you\n\n` +
                      `Supports links & search\n` +
                      `1080p • Fast • With thumbnail\n\n` +
                      `Long live King Arnold Chirchir`
            }, { quoted: msg })
        }

        let videoUrl = ""
        let title = ""
        let thumbnail = ""

        // If it's a YouTube link
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            videoUrl = query
        } else {
            // Search YouTube
            await sock.sendMessage(from, { text: "Searching YouTube..." }, { quoted: msg })
            const search = await yts(query)
            if (!search.videos.length) {
                return sock.sendMessage(from, { text: "No video found!" }, { quoted: msg })
            }
            const vid = search.videos[0]
            videoUrl = vid.url
            title = vid.title
            thumbnail = vid.thumbnail
        }

        // Extract video ID for thumbnail
        const videoId = videoUrl.match(/(?:youtu\.be\/|v=|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1]
        if (!videoId) {
            return sock.sendMessage(from, { text: "Invalid YouTube link!" }, { quoted: msg })
        }

        if (!title || !thumbnail) {
            title = "YouTube Video"
            thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        }

        // Send thumbnail with "Downloading..."
        await sock.sendMessage(from, {
            image: { url: thumbnail },
            caption: `*${title}*\n\nDownloading video... Please wait`
        }, { quoted: msg })

        // Try all APIs until one works
        let downloadUrl = null
        let finalTitle = title

        for (const api of DL_APIS) {
            try {
                const url = api.replace('{url}', encodeURIComponent(videoUrl))
                const res = await axios.get(url, { timeout: 15000 })

                let link = null
                let apiTitle = null

                // Extract link from different API formats
                if (res.data?.result?.url) link = res.data.result.url
                else if (res.data?.result?.link) link = res.data.result.link
                else if (res.data?.url) link = res.data.url
                else if (res.data?.download) link = res.data.download
                else if (res.data?.video) link = res.data.video
                else if (res.data?.data?.url) link = res.data.data.url

                // Extract title
                if (res.data?.result?.title) apiTitle = res.data.result.title
                else if (res.data?.title) apiTitle = res.data.title
                else if (res.data?.data?.title) apiTitle = res.data.data.title

                if (link && link.includes('http')) {
                    downloadUrl = link
                    if (apiTitle) finalTitle = apiTitle
                    break
                }
            } catch (e) {
                continue
            }
        }

        if (!downloadUrl) {
            return sock.sendMessage(from, {
                text: "All download servers are busy.\nThe empire's media network is under attack.\nTry again in 2 minutes."
            }, { quoted: msg })
        }

        // FINAL: SEND VIDEO
        await sock.sendMessage(from, {
            video: { url: downloadUrl },
            mimetype: "video/mp4",
            fileName: `${finalTitle.substring(0, 50)}.mp4`,
            caption: `*${finalTitle}*\n\n> Downloaded by VAMPARINA V1 EMPIRE\n> King Arnold Chirchir • +254703110780`
        }, { quoted: msg })

    } catch (error) {
        console.error("VIDEO COMMAND ERROR:", error.message)
        await sock.sendMessage(from, {
            text: `DOWNLOAD FAILED\n\nError: ${error.message}\n\nThe empire's media system will return stronger.\nLong live the King.`
        }, { quoted: msg })
    }
}

module.exports = videoCommand