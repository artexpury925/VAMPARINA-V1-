// commands/ai.js — VAMPARINA V1 AI COMMAND (2025)
// OWNER: GOD-KING ARNOLD CHIRCHIR (+254703110780)
// MULTI-MODEL • FALLBACK SYSTEM • ULTRA FAST • NEVER DIES

import axios from 'axios';

// TOP TIER WORKING APIs — TESTED NOVEMBER 2025
const AI_APIS = [
  // BLACKBOX AI — BEST & FASTEST (2025 KING)
  { name: "BLACKBOX", url: (q) => `https://www.blackbox.ai/api/chat?prompt=${encodeURIComponent(q)}` },
  
  // GEMINI PRO (Multiple working endpoints)
  { name: "GEMINI", url: (q) => `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(q)}` },
  { name: "GEMINI", url: (q) => `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(q)}` },
  { name: "GEMINI", url: (q) => `https://api.dreaded.site/api/gemini2?text=${encodeURIComponent(q)}` },
  
  // CHATGPT CLONES (Free & Fast)
  { name: "GPT", url: (q) => `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(q)}` },
  { name: "GPT", url: (q) => `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(q)}` },
  
  // FINAL FALLBACK — NEVER FAILS
  { name: "FINAL", url: (q) => `https://api.lolhuman.xyz/api/openai?apikey=giftedtech&text=${encodeURIComponent(q)}` }
];

export const handle = async (sock, from, msg) => {
  try {
    let query = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();

    // Remove command prefix
    query = query.replace(/^\.(ai|gpt|gemini|ask|chat)\s+/i, '').trim();

    if (!query) {
      return await sock.sendMessage(from, {
        text: `*VAMPARINA V1 — ARTIFICIAL INTELLIGENCE*\n\n` +
              `Command: .ai <question>\n\n` +
              `Example:\n` +
              `.ai Write a love poem for Kenya\n` +
              `.ai Explain quantum physics in Swahili\n` +
              `.ai Generate WhatsApp bot code\n\n` +
              `Powered by BLACKBOX AI + GEMINI PRO\n` +
              `Long live King Arnold Chirchir`
      }, { quoted: msg });
    }

    // Show thinking
    await sock.sendMessage(from, { react: { text: "AI", key: msg.key } });

    let answer = null;
    let usedApi = "";

    // TRY EACH API UNTIL ONE WORKS
    for (const api of AI_APIS) {
      try {
        const res = await axios.get(api.url(query), { 
          timeout: 15000,
          headers: { 'User-Agent': 'Vamparina-V1-Empire/2025' }
        });

        let result = null;

        if (api.name === "BLACKBOX") {
          result = res.data?.response || res.data?.message;
        } else if (res.data?.result) {
          result = res.data.result;
        } else if (res.data?.answer) {
          result = res.data.answer;
        } else if (res.data?.message) {
          result = res.data.message;
        } else if (res.data?.data) {
          result = res.data.data;
        }

        if (result && result.trim().length > 5) {
          answer = result.trim();
          usedApi = api.name;
          break;
        }
      } catch (err) {
        continue; // Try next API
      }
    }

    // FINAL RESPONSE
    if (answer) {
      await sock.sendMessage(from, { react: { text: "Checkmark", key: msg.key } });
      
      const finalText = `*VAMPARINA V1 AI RESPONSE*\n` +
                        `Powered by ${usedApi === "BLACKBOX" ? "BLACKBOX AI" : "GEMINI PRO"}\n\n` +
                        `${answer}\n\n` +
                        `_King Arnold Chirchir • +254703110780_\n` +
                        `_The Empire Never Sleeps_`;

      await sock.sendMessage(from, { text: finalText }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { 
        text: `AI SYSTEM OVERLOAD\n\nAll intelligence networks temporarily down.\nThe empire's mind is resting.\n\nTry again in 30 seconds.\n\nLong live the King.` 
      }, { quoted: msg });
    }

  } catch (error) {
    console.error("AI COMMAND ERROR:", error.message);
    await sock.sendMessage(from, { 
      text: `AI CORE FAILURE\n\nError: ${error.message}\n\nThe empire's intelligence will return stronger.\n\nLong live King Arnold.` 
    }, { quoted: msg });
  }
};