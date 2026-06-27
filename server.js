const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdl = require('@distube/ytdl-core');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =======================================================
// API ROUTE: Fetch Direct Streaming URL for Browser Player
// =======================================================
app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Please provide a valid YouTube Shorts URL.' });
    }

    let videoId = '';
    
    // Extract the 11-character video ID from the URL string
    if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0]?.split('&')[0];
    } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (!videoId || videoId.length !== 11) {
        return res.status(400).json({ error: 'Could not extract a valid YouTube Video ID. Ensure the link is correct.' });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        // Fetch streaming signatures using native client mock headers
        const info = await ytdl.getInfo(videoUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            }
        });

        // Isolate a unified MP4 stream format containing combined video and audio tracks
        const format = ytdl.chooseFormat(info.formats, { 
            filter: 'audioandvideo', 
            quality: 'highestvideo' 
        });

        if (format && format.url) {
            // Send the raw stream URL back to the frontend
            return res.json({
                success: true,
                streamUrl: format.url,
                title: info.videoDetails.title || 'YouTube Short'
            });
        } else {
            throw new Error('No compatible browser formats found.');
        }

    } catch (error) {
        console.error('Link Extraction Failure:', error.message);
        res.status(500).json({ error: 'Failed to extract video streams. Please verify the link or try another one.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable streaming router running on port ${PORT}`));
