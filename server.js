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

    // Clean up the URL format to handle clean standard lookups
    let cleanUrl = url.trim();
    if (cleanUrl.includes('shorts/')) {
        const videoId = cleanUrl.split('shorts/')[1]?.split('?')[0];
        if (videoId) cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }

    try {
        // Universal direct fetching options that don't trigger account location verification flags
        const metadata = await ytdlp(cleanUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
            // Uses a clean web crawler identity instead of a standard browser proxy simulation
            addHeader: ['referer:youtube.com', 'user-agent:googlebot']
        });

        const parsedData = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        
        if (!parsedData.id) throw new Error('Missing tracking layout identifiers.');

        res.json({
            success: true,
            videoId: parsedData.id,
            title: parsedData.title || 'YouTube Short Video'
        });

    } catch (error) {
        console.error('Extraction Error:', error.message);
        // Fallback layout: If extraction fails due to server location restrictions, bypass it by passing parameters blindly
        if (cleanUrl.includes('v=')) {
            const fallbackId = cleanUrl.split('v=')[1]?.split('&')[0];
            if (fallbackId) {
                return res.json({
                    success: true,
                    videoId: fallbackId,
                    title: 'YouTube Short'
                });
            }
        }
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
        format: 'mp4', // Forces a universal flat stream configuration 
        output: '-',
        noWarnings: true,
        noCheckCertificates: true,
        addHeader: ['referer:youtube.com', 'user-agent:googlebot']
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
