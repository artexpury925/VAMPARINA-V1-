// commands/sudo.js — VAMPARINA V1 SUDO COMMAND (2025)
// OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
// ONLY THE KING CAN GRANT OR REVOKE POWER

const { addSudo, removeSudo, getSudoList } = require('../lib/index')

// Extract number from mention or text
function extractNumber(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (mentioned) return mentioned

    const text = message.message?.conversation || 
                 message.message?.extendedTextMessage?.text || ''
    
    const match = text.match(/(\d{7,15})/)
    return match ? match[1] + '@s.whatsapp.net' : null
}

async function sudoCommand(sock, from, msg) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid
        const KING_ARNOLD = '254703110780@s.whatsapp.net'

        // Only the KING can use this command
        if (sender !== KING_ARNOLD && !msg.key.fromMe) {
            return await sock.sendMessage(from, { 
                text: 'Only *KING ARNOLD CHIRCHIR* can control the SUDO realm.\n\nLong live the King.' 
            }, { quoted: msg })
        }

        const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim()
        const args = text.split(' ').slice(1)
        const action = args[0]?.toLowerCase()

        // Help menu
        if (!action || !['add', 'del', 'remove', 'list'].includes(action)) {
            return await sock.sendMessage(from, { 
                text: `*SUDO COMMAND — VAMPARINA V1 EMPIRE*\n\n` +
                      `Usage:\n` +
                      `.sudo add @user or number\n` +
                      `.sudo del @user or number\n` +
                      `.sudo list\n\n` +
                      `Only *King Arnold Chirchir* can grant or revoke power.\n` +
                      `+254703110780 = Eternal Ruler`
            }, { quoted: msg })
        }

        // LIST SUDO USERS
        if (action === 'list') {
            const sudoList = await getSudoList()
            if (sudoList.length === 0) {
                return await sock.sendMessage(from, { 
                    text: 'No SUDO warriors appointed yet.\n\nThe King rules alone — as it should be.' 
                }, { quoted: msg })
            }

            let list = '*CURRENT SUDO WARRIORS*\n\n'
            sudoList.forEach((user, i) => {
                const num = user.replace('@s.whatsapp.net', '')
                list += `${i + 1}. ${num}\n`
            })
            list += `\nTotal: ${sudoList.length} elite soldiers\n\nLong live the Empire.`

            return await sock.sendMessage(from, { text: list }, { quoted: msg })
        }

        // ADD or REMOVE SUDO
        const target = extractNumber(msg)
        if (!target) {
            return await sock.sendMessage(from, { 
                text: 'Please tag a user or type their number.\nExample: `.sudo add 254700000000`' 
            }, { quoted: msg })
        }

        const targetNum = target.replace('@s.whatsapp.net', '')

        if (target === KING_ARNOLD) {
            return await sock.sendMessage(from, { 
                text: 'The King cannot be added or removed.\nHe is eternal.' 
            }, { quoted: msg })
        }

        if (action === 'add') {
            const success = await addSudo(target)
            await sock.sendMessage(from, { 
                text: success 
                    ? `NEW SUDO APPOINTED\n\nNumber: ${targetNum}\nStatus: Elite Warrior\n\nThe empire grows stronger.`
                    : `Failed to appoint ${targetNum}\nAlready a sudo or error occurred.`
            }, { quoted: msg })

            if (success) {
                await sock.sendMessage(target, { 
                    text: `*YOU HAVE BEEN CHOSEN*\n\nKing Arnold Chirchir has granted you SUDO powers in the Vamparina V1 Empire.\n\nUse your power wisely.\nLong live the King.` 
                })
            }
        }

        if (action === 'del' || action === 'remove') {
            const success = await removeSudo(target)
            await sock.sendMessage(from, { 
                text: success 
                    ? `SUDO REVOKED\n\nNumber: ${targetNum}\nStatus: Power Stripped\n\nTraitors are not tolerated.`
                    : `Failed to remove ${targetNum}\nNot in sudo list.`
            }, { quoted: msg })

            if (success) {
                await sock.sendMessage(target, { 
                    text: `*YOUR POWER HAS BEEN REVOKED*\n\nKing Arnold Chirchir has removed your SUDO access.\n\nYou are no longer part of the inner circle.\nThe King’s word is final.` 
                })
            }
        }

    } catch (error) {
        console.error("SUDO COMMAND ERROR:", error)
        await sock.sendMessage(from, { 
            text: `SUDO System Error:\n${error.message}\n\nThe empire remains unbreakable.` 
        }, { quoted: msg })
    }
}

module.exports = sudoCommand