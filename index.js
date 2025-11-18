// QR PAGE — FINAL FIX (REPLACES YOUR OLD /qr ROUTE)
app.get('/qr', async (req, res) => {
    const tempId = 'qr_' + Date.now();
    const tempPath = path.join(TEMP_DIR, tempId);
    fs.mkdirSync(tempPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(tempPath);
    const baileysVersion = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version: baileysVersion,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: false,
        connectTimeoutMs: 60_000,     // ← NEW
        keepAliveIntervalMs: 20_000,  // ← NEW — KEEPS CONNECTION ALIVE
    });

    let sent = false;
    const timeout = setTimeout(() => {
        if (!sent) {
            res.send(`<h1 style="color:red">TIMEOUT — TOO SLOW</h1><a href="/qr">TRY AGAIN</a>`);
            sock.end();
        }
    }, 90_000); // 90 seconds max

    sock.ev.on('connection.update', async (update) => {
        if (update.qr && !sent) {
            sent = true;
            clearTimeout(timeout);
            const qrImg = await QRCode.toDataURL(update.qr);
            res.send(`<!DOCTYPE html><html><head><title>SCAN QR</title>
            <style>body{background:#000;color:#0f0;text-align:center;padding:30px;font-family:Arial;}
            h1{font-size:50px;text-shadow:0 0 30px lime;}
            img{max-width:400px;border:10px solid lime;border-radius:25px;margin:30px;}</style></head>
            <body><h1>VAMPARINA V1</h1>
            <img src="${qrImg}"><br><br>
            <h2>SCAN FAST — QR EXPIRES IN 60 SECONDS</h2>
            <b>King Arnold • +254703110780</b></body></html>`);
        }
        if (update.connection === 'open') {
            clearTimeout(timeout);
            const phone = sock.user.id.split('@')[0];
            const sessionId = `vamp_${phone}_${Date.now()}`;
            const finalPath = path.join(SESSION_DIR, sessionId);
            fs.mkdirSync(finalPath, { recursive: true });
            fs.cpSync(tempPath, finalPath, { recursive: true });
            await delay(10000);
            startEmpireBot(sessionId, phone, finalPath);
            fs.rmSync(tempPath, { recursive: true, force: true });
        }
        if (update.connection === 'close' && !sent) {
            clearTimeout(timeout);
            res.send(`<h1 style="color:red">CONNECTION CLOSED</h1><a href="/qr" style="color:lime;font-size:30px;">TRY AGAIN</a>`);
        }
    });
    sock.ev.on('creds.update', saveCreds);
});