// commands/github.js — VAMPARINA V1 GITHUB COMMAND (2025 EDITION)
// OWNER: KING ARNOLD CHIRCHIR (+254703110780)

const moment = require('moment-timezone')
const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

async function githubCommand(sock, from, msg) {
    try {
        const repoUrl = 'https://api.github.com/repos/artexpury925/VAMPARINA-V1-'  // ← YOUR REAL REPO
        const res = await fetch(repoUrl, {
            headers: {
                'User-Agent': 'Vamparina-V1-Empire-Bot'  // GitHub requires User-Agent
            }
        })

        if (!res.ok) {
            const error = await res.text()
            throw new Error(`GitHub API Error: ${res.status} - ${error}`)
        }

        const repo = await res.json()

        let caption = `*VAMPARINA V1 EMPIRE REPO*\n\n`
        caption += `Name      : ${repo.name}\n`
        caption += `Owner     : ${repo.owner?.login || 'King Arnold'}\n`
        caption += `Stars     : ${repo.stargazers_count.toLocaleString()}\n`
        caption += `Forks     : ${repo.forks_count.toLocaleString()}\n`
        caption += `Watchers  : ${repo.subscribers_count?.toLocaleString() || repo.watchers_count.toLocaleString()}\n`
        caption += `Issues    : ${repo.open_issues_count}\n`
        caption += `Size      : ${(repo.size / 1024).toFixed(2)} MB\n`
        caption += `Language  : ${repo.language || 'JavaScript'}\n`
        caption += `Created   : ${moment(repo.created_at).format('DD MMM YYYY')}\n`
        caption += `Updated   : ${moment(repo.updated_at).format('DD MMM YYYY - HH:mm')}\n\n`
        caption += `Link      : ${repo.html_url}\n\n`
        caption += `*LONG LIVE KING ARNOLD CHIRCHIR*`

        // Try to send with image (if exists)
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg')
        let imageSent = false

        if (fs.existsSync(imagePath)) {
            try {
                const imageBuffer = fs.readFileSync(imagePath)
                await sock.sendMessage(from, {
                    image: imageBuffer,
                    caption: caption
                }, { quoted: msg })
                imageSent = true
            } catch (imgErr) {
                console.log("Image failed, sending text only:", imgErr.message)
            }
        }

        // Fallback: send as text if image fails or doesn't exist
        if (!imageSent) {
            await sock.sendMessage(from, {
                text: caption
            }, { quoted: msg })
        }

    } catch (err) {
        console.error("GitHub Command Error:", err.message)
        await sock.sendMessage(from, {
            text: `*ERROR*\nCould not fetch repo info.\n\nReason: ${err.message}\n\nYour empire is still strong, King Arnold.`
        }, { quoted: msg })
    }
}

module.exports = githubCommand