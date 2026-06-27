const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the clean frontend application layer
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =======================================================
// API ROUTE: Text-Isolation Link Generation (Bypasses Blocks)
// =======================================================
app.post('/api/download', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Please enter a valid URL parameter.' });
    }

    let videoId = '';
    
    // Process text patterns locally without hitting the external internet
    if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0]?.split('&')[0];
    } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (!videoId || videoId.length !== 11) {
        return res.status(400).json({ error: 'Could not resolve a valid 11-character YouTube Video ID structure.' });
    }

    // Build the high-compatibility user web streaming fallback destination
    const securePlaybackUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

    res.json({
        success: true,
        videoId: videoId,
        streamUrl: securePlaybackUrl,
        title: 'Ready for Conversion'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Professional UI router active on port ${PORT}`));
