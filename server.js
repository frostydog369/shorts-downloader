const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdl = require('@distube/ytdl-core');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =======================================================
// API ROUTE: Fetch Video Details (Ultra-Lightweight Text Layer)
// =======================================================
app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Please provide a valid YouTube Shorts URL.' });
    }

    let videoId = '';
    
    // Instantly extract the 11-character video ID from the URL string text
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

    // Instantly send back success to open up the frontend green button layout
    res.json({
        success: true,
        videoId: videoId,
        title: 'YouTube Shorts Video'
    });
});

// =======================================================
// API ROUTE: Safe Native JavaScript Streaming Pipe
// =======================================================
app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;

    if (!videoId) {
        return res.status(400).send('Missing video target identifier.');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Set download attachment headers
    res.setHeader('Content-Disposition', `attachment; filename="ShortsFast-${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    try {
        // Stream natively using pure JavaScript streams without spawning heavy Linux binaries
        // This keeps RAM usage incredibly low to prevent Render server memory crashes
        ytdl(videoUrl, {
            format: 'mp4',
            quality: 'highestvideo',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            }
        }).pipe(res);

    } catch (streamError) {
        console.error('Native Stream Error:', streamError.message);
        if (!res.headersSent) {
            res.status(500).send('Backend engine interface failed.');
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable backend running on port ${PORT}`));
