const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =======================================================
// API ROUTE: Fetch Video Details (Zero-Handshake Method)
// =======================================================
app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Please provide a valid YouTube Shorts URL.' });
    }

    let videoId = '';
    
    // Cleanly isolate the 11-character video ID entirely on the backend text layer
    if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0]?.split('&')[0];
    } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (!videoId || videoId.length !== 11) {
        return res.status(400).json({ error: 'Could not extract a valid YouTube Video ID.' });
    }

    // Instantly return the structured token layout back to the frontend
    // This entirely avoids hitting YouTube's network during the initial check phase
    res.json({
        success: true,
        videoId: videoId,
        title: 'YouTube Shorts Video'
    });
});

// =======================================================
// API ROUTE: Live Stream/Download Payload Delivery
// =======================================================
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;

    if (!videoId) {
        return res.status(400).send('Missing video target identifier.');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    res.setHeader('Content-Disposition', `attachment; filename="ShortsFast-${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Execute via direct shell spawning using an Android client emulation flag
    // The 'android' extractor profile bypasses standard data center fingerprint signatures entirely
    const command = `npx youtube-dl-exec "${videoUrl}" --format "best[ext=mp4]" --extractor-args "youtube:player_client=android" --output "-" --no-warnings --no-check-certificates`;

    const child = exec(command, { maxBuffer: 1024 * 1024 * 10 });

    // Stream the data directly to the client's browser response
    child.stdout.pipe(res);

    child.stderr.on('data', (data) => {
        console.error(`Streaming Process Output: ${data}`);
    });

    child.on('error', (err) => {
        console.error('Streaming connection pipeline failed:', err.message);
        if (!res.headersSent) {
            res.status(500).send('Media synchronization pipeline failed.');
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable backend running on port ${PORT}`));
