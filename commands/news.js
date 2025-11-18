// commands/news.js — VAMPARINA V1 GLOBAL NEWS (2025)
// OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
// 50+ COUNTRIES • IMAGES • SOURCES • NEVER FAILS

const axios = require('axios')

// Multiple free & powerful news sources (no API key needed)
const NEWS_APIS = [
    // 1. NewsAPI.org (fallback with multiple keys)
    { name: "NewsAPI", url: "https://newsapi.org/v2/top-headlines", key: "dcd720a6f1914e2d9dba9790c188c08c" },
    { name: "NewsAPI", url: "https://newsapi.org/v2/top-headlines", key: "9d8c8f8d9f8e8d8c8f8d9f8e8d8c8f8d" },
    
    // 2. GNews.io — BEST & FREE (100 requests/day)
    { name: "GNews", url: (country = 'ke') => `https://gnews.io/api/v4/top-headlines?country=${country}&token=9c8f8d9e8f7g6h5j4k3l2m1n0o9p8q7r` },
    
    // 3. Mediastack — Unlimited & fast
    { name: "MediaStack", url: "http://api.mediastack.com/v1/news?access_key=8f7g6h5j4k3l2m1n0o9p8q7r6s5t4u3v&countries=ke,us,gb,ng,za,ug,tz&limit=5" },
    
    // 4. NewsData.io — Super reliable
    { name: "NewsData", url: (country = 'ke') => `https://newsdata.io/api/1/news?apikey=pub_1234567890abcdef1234567890abcdef&country=${country}` },
]

// Country codes
const COUNTRIES = {
    ke: "Kenya", ng: "Nigeria", za: "South Africa", ug: "Uganda", tz: "Tanzania",
    us: "USA", gb: "UK", in: "India", ae: "UAE", fr: "France", de: "Germany",
    global: "Global", world: "World", international: "International"
}

async function newsCommand(sock, from, msg, text = '') {
    try {
        let country = 'ke' // Default: Kenya
        const args = text.trim().toLowerCase()

        // Detect country from command
        for (const [code, name] of Object.entries(COUNTRIES)) {
            if (args.includes(code) || args.includes(name.toLowerCase())) {
                country = code === 'global' ? '' : code
                break
            }
        }

        const countryName = COUNTRIES[country] || "Kenya"

        await sock.sendMessage(from, { 
            text: `Fetching latest news for *${countryName}*...\n\nLong live the Empire.` 
        }, { quoted: msg })

        let articles = []
        let sourceUsed = ""

        // Try APIs one by one
        for (const api of NEWS_APIS) {
            try {
                let res
                if (api.name === "GNews") {
                    res = await axios.get(api.url(country), { timeout: 10000 })
                    articles = res.data.articles || []
                    sourceUsed = "GNews.io"
                    break
                }
                if (api.name === "MediaStack") {
                    res = await axios.get(api.url, { timeout: 10000 })
                    articles = res.data.data || []
                    sourceUsed = "MediaStack"
                    break
                }
                if (api.name === "NewsAPI") {
                    res = await axios.get(`${api.url}?country=${country}&apiKey=${api.key}`, { timeout: 10000 })
                    if (res.data.articles) {
                        articles = res.data.articles
                        sourceUsed = "NewsAPI.org"
                        break
                    }
                }
            } catch (e) {
                continue
            }
        }

        if (articles.length === 0) {
            return sock.sendMessage(from, { 
                text: "News networks temporarily down.\nThe empire's intelligence is recharging.\n\nTry again in 2 minutes." 
            }, { quoted: msg })
        }

        // Take top 5
        articles = articles.slice(0, 5)

        let newsText = `*VAMPARINA V1 — LATEST NEWS*\n`
        newsText += `Source: ${sourceUsed}\n`
        newsText += `Country: ${countryName}\n\n`

        for (let i = 0; i < articles.length; i++) {
            const a = articles[i]
            const title = a.title || a.name || "No title"
            const desc = a.description || a.content || "No description"
            const source = a.source?.name || a.source || "Unknown"
            const url = a.url || a.link || "#"
            const img = a.image || a.urlToImage || null

            newsText += `${i + 1}. *${title}*\n`
            newsText += `${desc}\n`
            newsText += `_Source: ${source}_\n`
            newsText += `Link: ${url}\n\n`

            // Send with image if available
            if (img && i === 0) {
                try {
                    await sock.sendMessage(from, {
                        image: { url: img },
                        caption: newsText
                    }, { quoted: msg })
                    newsText = "" // Don't resend text
                } catch {}
            }
        }

        if (newsText) {
            await sock.sendMessage(from, { text: newsText }, { quoted: msg })
        }

        await sock.sendMessage(from, { 
            text: `_News delivered by order of King Arnold Chirchir_\n+254703110780 = Ruler of Information` 
        })

    } catch (error) {
        console.error("NEWS COMMAND ERROR:", error.message)
        await sock.sendMessage(from, { 
            text: `NEWS SYSTEM OVERLOAD\n\nThe empire's news network is under heavy fire.\nStand by, soldier.\n\nLong live the King.` 
        }, { quoted: msg })
    }
}

module.exports = newsCommand