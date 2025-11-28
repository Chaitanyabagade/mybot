const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const https = require('https');
const path = require('path');


const options = {
    hostname: 'darkslategray-lion-860323.hostingersite.com',
    path: '/fire/sendNotification.php',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://google.com',
        'Origin': 'https://google.com',
    }
};
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth1')  // 👈 absolute path fix
    }),
    puppeteer: {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process'
        ]
    }
});

client.on('qr', qr => {
    console.log('Scan this QR code with your phone:');
    console.log(qr);
});

let isdone = 0;
let isSent = 0;
let online = 0;
client.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');

    if (isdone === 0) {
        const page = await client.pupPage;
        const phone = '918087472049';
        const url = `https://web.whatsapp.com/send?phone=${phone}`;
        console.log(`Opening chat with ${phone}...`);
        await page.goto(url);
        isdone = 1;

        // Wait for chat to load
        await page.waitForSelector("._21S-L", { timeout: 20000 }).catch(() => {
            console.log("❌ Chat did not load.");
        });

        // Start checking online status every 5 seconds
        let lastOnlineStart = null;
        let lastOnlineDuration = null;

        setInterval(async () => {
            await page.waitForSelector('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk');
            await page.click('div.x1iyjqo2.x6ikm8r.x10wlt62.x1mzt3pk');

            try {
                const isOnline = await page.evaluate(() => {
                    const span = document.querySelector('span[title="online"]');
                    return !!span;
                });

                if (isOnline) {
                    console.log("🟢 User is online");

                    // First time online → mark start time
                    if (online === 0) {
                        lastOnlineStart = new Date();  // store time stamp
                        console.log("⏱ Online start recorded:", lastOnlineStart.toLocaleTimeString());
                    }

                    online = 1;

                    // Send message only *once* when user comes online
                    if (isSent === 0) {

                        let msg = "User came online!";

                        // If previous duration exists → include in message
                        if (lastOnlineDuration) {
                            msg += `\nPrevious online duration: ${lastOnlineDuration}`;
                        }

                        const axios = require("axios");
                        try {
                            await axios.post("http://localhost:3000/send", {
                                number: "918087472049",
                                message: msg
                            });
                            console.log("📤 Notification sent!");
                        } catch (err) {
                            console.error("❌ Error sending message:", err);
                        }

                        isSent = 1;
                    }

                } else {
                    console.log("🔴 User is offline");

                    if (online === 1) {
                        // User just went offline → calculate duration
                        const now = new Date();

                        if (lastOnlineStart) {
                            let diffMs = now - lastOnlineStart;
                            let diffSec = Math.floor(diffMs / 1000);

                            // APPLY -10 SECONDS OFFSET
                            diffSec = diffSec - 10;
                            if (diffSec < 0) diffSec = 0; // prevent negative values

                            const min = Math.floor(diffSec / 60);
                            const sec = diffSec % 60;

                            lastOnlineDuration = `${min}m ${sec}s`;

                            console.log("📉 User went offline. Duration:", lastOnlineDuration);
                        }

                        lastOnlineStart = null; // reset
                    }

                    online = 0;
                    isSent = 0;  // allow next message on next online event
                }

            } catch (err) {
                console.log("❌ Error:", err.message);
            }
        }, 1000);
    }
});

client.initialize();