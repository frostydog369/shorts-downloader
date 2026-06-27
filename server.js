const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Please provide a valid URL.' });
    }

    try {
        // Query yt-dlp to get the absolute best direct video stream format
        const output = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        });

        // Find a format that has both audio and video pre-combined (usually 720p or 360p)
        const format = output.formats.reverse().find(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4');

        if (!format || !format.url) {
            return res.status(404).json({ error: 'Could not find a clean MP4 format.' });
        }

        // Send back a tracking token and URL
        return res.json({ videoId: output.id });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'YouTube blocked this connection. Try a different video link.' });
    }
});

app.get('/api/stream', async (req, res) => {
    const { id } = req.query;
    const videoUrl = `https://www.youtube.com/watch?v=${id}`;

    try {
        res.header('Content-Disposition', 'attachment; filename="shorts-video.mp4"');
        res.header('Content-Type', 'video/mp4');

        // Dynamically stream the video directly from yt-dlp back to the user's browser
        const streamProcess = youtubedl.exec(videoUrl, {
            format: 'best[ext=mp4]/best',
            output: '-'
        });

        streamProcess.stdout.pipe(res);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error streaming media');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Stable backend running on port ${PORT}`));