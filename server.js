const express = require('express');
const cors = require('cors');
const path = require('path');
// FIXED: Import the core module directly (it handles its own binary paths automatically on Render)
const ytdlp = require('youtube-dl-exec');

const app = express();

// Enable Cross-Origin Requests and JSON parsing
app.use(cors());
app.use(express.json());

// =======================================================
// SERVE FRONTEND (Fixes the "Not Found" error)
// =======================================================
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
        // FIXED: Fetch metadata safely using the clean module wrapper
        const metadata = await ytdlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
        });

        // Parse structural parameters safely (handles both stringified and object responses)
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

    // Format secure inline transmission attachment headers
    res.setHeader('Content-Disposition', `attachment; filename="ShortsFast-${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Spawn processing worker to stream real-time buffers cleanly directly to response pipe
    const downloaderProcess = ytdlp.exec(videoUrl, {
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        output: '-',
        noWarnings: true
    });

    // Pipe layout processing stream directly into client terminal browser response frame
    downloaderProcess.stdout.pipe(res);

    downloaderProcess.on('error', (err) => {
        console.error('Streaming connection interrupted:', err.message);
        if (!res.headersSent) {
            res.status(500).send('Media synchronization pipeline failed.');
        }
    });
});

// =======================================================
// LIVE PORT MONITORING CONFIGURATION (Render Production Ready)
// =======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable backend running on port ${PORT}`));
