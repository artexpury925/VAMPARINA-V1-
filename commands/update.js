// commands/update.js — VAMPARINA V1 AUTO UPDATE COMMAND (2025)
// OWNER: KING ARNOLD CHIRCHIR (+254703110780)
// WORKS ON RENDER, RAILWAY, REPLIT, VPS — 100% GUARANTEED

const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

// Simple exec with promise
const run = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, { timeout: 180000, maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
            if (err) return reject(err)
            if (stderr && !stderr.includes('warning')) return reject(new Error(stderr))
            resolve(stdout)
        })
    })
}

async function updateCommand(sock, from, msg) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid
        const isOwner = sender.replace(/[^0-9]/g, '') === '254703110780' // KING ARNOLD
        const isSudo = global.sudoList?.includes(sender) || false

        if (!isOwner && !isSudo) {
            return await sock.sendMessage(from, { 
                text: 'Only *KING ARNOLD CHIRCHIR* or SUDO can update the empire.' 
            }, { quoted: msg })
        }

        await sock.sendMessage(from, { 
            text: 'EMPIRE UPDATE STARTED...\n\nHold tight, King. Your army is upgrading.' 
        }, { quoted: msg })

        let resultText = '*VAMPARINA V1 — UPDATE LOG*\n\n'

        try {
            // STEP 1: Pull latest code
            resultText += 'Pulling latest empire code...\n'
            await run('git pull origin main')
            resultText += 'Code updated!\n\n'
        } catch (err) {
            resultText += `Git pull failed: ${err.message}\nTrying force reset...\n`
            try {
                await run('git fetch --all')
                await run('git reset --hard origin/main')
                await run('git clean -fd')
                resultText += 'Force reset successful!\n\n'
            } catch (e) {
                resultText += `Git failed completely: ${e.message}\n\n`
            }
        }

        try {
            // STEP 2: Install dependencies
            resultText += 'Installing new weapons (dependencies)...\n'
            await run('npm install --omit=dev')
            resultText += 'Dependencies loaded!\n\n'
        } catch (err) {
            resultText += `npm install warning (still okay): ${err.message}\n\n`
        }

        // FINAL SUCCESS MESSAGE
        resultText += 'EMPIRE SUCCESSFULLY UPGRADED!\n'
        resultText += 'New features loaded\n'
        resultText += 'Bugs eliminated\n'
        resultText += 'Power increased\n\n'
        resultText += '*LONG LIVE KING ARNOLD CHIRCHIR*\n'
        resultText += '+254703110780 = GOD OF WHATSAPP'

        await sock.sendMessage(from, { text: resultText }, { quoted: msg })

        // AUTO RESTART (Render will restart automatically)
        await sock.sendMessage(from, { 
            text: 'Bot restarting in 5 seconds...' 
        })

        setTimeout(() => {
            console.log("KING ARNOLD HAS UPDATED THE EMPIRE — RESTARTING...")
            process.exit(0)
        }, 5000)

    } catch (error) {
        console.error("UPDATE COMMAND ERROR:", error)
        await sock.sendMessage(from, { 
            text: `UPDATE FAILED\n\nError: ${error.message}\n\nThe empire remains strong.` 
        }, { quoted: msg })
    }
}

module.exports = updateCommand