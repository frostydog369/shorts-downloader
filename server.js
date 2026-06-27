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
// API ROUTE: Fetch Video Details (Zero-Handshake ID Stripper)
// =======================================================
app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Please provide a valid YouTube Shorts URL.' });
    }

    let videoId = '';
    
    // Parse the URL strings instantly on the text layer to avoid network overhead
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

    // Instantly pass the structure back to make the frontend green download button show up
    res.json({
        success: true,
        videoId: videoId,
        title: 'YouTube Shorts Video'
    });
});

// =======================================================
// API ROUTE: Live Stream Delivery (Crash-Resistant Native Code)
// =======================================================
app.get('/api/stream', (req, res) => {
    const videoId = req.query.id;

    if (!videoId) {
        return res.status(400).send('Missing video target identifier.');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Format secure download attachment frames
    res.setHeader('Content-Disposition', `attachment; filename="ShortsFast-${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    try {
        // FIXED: Using native .exec function wrapper instead of shell command execution string strings
        // This avoids spawning massive shell wrappers and keeps Render's memory footprint incredibly small
        const downloaderProcess = ytdlp.exec(videoUrl, {
            format: 'best[ext=mp4]',
            output: '-',
            noWarnings: true,
            noCheckCertificates: true,
            // Keeps the crucial mobile app player emulation protocol to slice past YouTube's IP filters
            extractorArgs: 'youtube:player_client=android'
        });

        // Safe stream plumbing directly down the user response pipe
        downloaderProcess.stdout.pipe(res);

        downloaderProcess.on('error', (err) => {
            console.error('Streaming pipeline error:', err.message);
            if (!res.headersSent) {
                res.status(500).send('Media synchronization pipeline failed.');
            }
        });

    } catch (streamError) {
        console.error('Process Execution Failure:', streamError.message);
        if (!res.headersSent) {
            res.status(500).send('Backend engine interface failed.');
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable backend running on port ${PORT}`));
