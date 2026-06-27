const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdlp = require('youtube-dl-exec');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =======================================================
// API ROUTE: Fetch Video Details
// =======================================================
app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Please provide a valid YouTube Shorts URL.' });
    }

    try {
        const metadata = await ytdlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            referer: 'https://www.youtube.com/',
            // FIXED: Tells yt-dlp to read your uploaded cookie validation token
            cookiefile: path.join(__dirname, 'cookies.txt')
        });

        const parsedData = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        
        if (!parsedData.id) throw new Error('Could not resolve video tracking layout identifiers.');

        res.json({
            success: true,
            videoId: parsedData.id,
            title: parsedData.title || 'YouTube Short Video'
        });

    } catch (error) {
        console.error('Extraction Error:', error.message);
        res.status(500).json({ error: 'Failed to extract video streams. Ensure the link is a valid public Short.' });
    }
});

// =======================================================
// API ROUTE: Live Stream/Download Payload Delivery
// =======================================================
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;

    if (!videoId) {
        return res.status(400).send('Missing video target identifier blocks.');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    res.setHeader('Content-Disposition', `attachment; filename="ShortsFast-${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    const downloaderProcess = ytdlp.exec(videoUrl, {
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        output: '-',
        noWarnings: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        referer: 'https://www.youtube.com/',
        // FIXED: Tells the streaming process to use the cookie validation token as well
        cookiefile: path.join(__dirname, 'cookies.txt')
    });

    downloaderProcess.stdout.pipe(res);

    downloaderProcess.on('error', (err) => {
        console.error('Streaming connection interrupted:', err.message);
        if (!res.headersSent) {
            res.status(500).send('Media synchronization pipeline failed.');
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable backend running on port ${PORT}`));
