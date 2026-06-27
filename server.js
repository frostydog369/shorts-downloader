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
// API ROUTE: Secure Data Proxy Stream (Forces File Save)
// =======================================================
app.get('/api/stream', async (req, res) => {
    const { id } = req.query;

    if (!id || id.length !== 11) {
        return res.status(400).send('Invalid or missing Video ID.');
    }

    const videoUrl = `https://www.youtube.com/watch?v=${id}`;

    try {
        // Set attachment download headers to force the browser "Save As" dialogue window
        res.setHeader('Content-Disposition', `attachment; filename="ShortsFast_${id}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        // Target combined tracks natively using custom spoof headers to skip filters
        ytdl(videoUrl, {
            filter: 'audioandvideo',
            quality: 'highestvideo',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                }
            }
        }).on('error', (err) => {
            console.error('Streaming pipeline broken:', err.message);
            if (!res.headersSent) {
                res.status(500).send('Video stream pipeline interrupted.');
            }
        }).pipe(res); // Directly streams the data bytes down to user storage

    } catch (error) {
        console.error('Error starting proxy stream:', error.message);
        if (!res.headersSent) {
            res.status(500).send('Failed to process stream.');
        }
    }
});

// Post route just validates link format strings locally first
app.post('/api/download', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing link configuration.' });

    let videoId = '';
    if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0]?.split('&')[0];
    } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (!videoId || videoId.length !== 11) {
        return res.status(400).json({ error: 'Invalid link structure configuration.' });
    }

    res.json({ success: true, videoId: videoId });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server streaming active on port ${PORT}`));
