/**
 * YouTube API Proxy Routes
 * Güvenlik: API key frontend'e çıkmasın diye server tarafında proxy yapıyoruz.
 * Endpointler:
 *   GET /api/youtube/playlist-items?playlistId=...&maxResults=20
 */
const express = require('express');
const router = express.Router();

// Node 18+ global fetch, yoksa node-fetch fallback
let _fetch = global.fetch;
if (typeof _fetch !== 'function') {
  _fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
}

const YT_API_KEY = process.env.YOUTUBE_API_KEY; // .env'de tanımlayın (YOUTUBE_API_KEY=...)

// ISO8601 -> saniye
const parseDuration = (iso) => {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
};

// saniye -> mm:ss veya hh:mm:ss
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

// GET playlist items
router.get('/playlist-items', async (req, res) => {
  try {
    if (!YT_API_KEY) {
      return res.status(500).json({ message: 'YouTube API anahtarı yapılandırılmamış (YOUTUBE_API_KEY).'});
    }
    const { playlistId, pageToken, maxResults = 20 } = req.query;
    if (!playlistId) {
      return res.status(400).json({ message: 'playlistId gerekli' });
    }

    // 1) Playlist items (snippet)
    const base = 'https://www.googleapis.com/youtube/v3/playlistItems';
    const params = new URLSearchParams({
      key: YT_API_KEY,
      playlistId: playlistId.toString(),
      maxResults: Math.min(Number(maxResults) || 20, 50).toString(),
      part: 'snippet,contentDetails'
    });
    if (pageToken) params.set('pageToken', pageToken.toString());
    const listResp = await _fetch(`${base}?${params.toString()}`);
    const listJson = await listResp.json();
    if (!listResp.ok) {
      return res.status(listResp.status).json({ message: listJson.error?.message || 'YouTube playlistItems hatası' });
    }
    const videoIds = (listJson.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
    // 2) Video durations
    let durationsMap = {};
    if (videoIds.length) {
      const videosResp = await _fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${YT_API_KEY}`);
      const videosJson = await videosResp.json();
      if (videosResp.ok) {
        (videosJson.items || []).forEach(v => {
          durationsMap[v.id] = v.contentDetails?.duration;
        });
      }
    }

    const videos = (listJson.items || []).map(item => {
      const vid = item.contentDetails?.videoId;
      const iso = durationsMap[vid] || null;
      const seconds = parseDuration(iso);
      return {
        id: vid,
        title: item.snippet?.title,
        publishedAt: item.snippet?.publishedAt,
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        duration: formatDuration(seconds),
        durationSeconds: seconds,
        channelTitle: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle,
        position: item.snippet?.position,
      };
    });

    return res.json({
      message: 'OK',
      data: {
        playlistId,
        totalResults: listJson.pageInfo?.totalResults,
        nextPageToken: listJson.nextPageToken || null,
        prevPageToken: listJson.prevPageToken || null,
        videos
      }
    });
  } catch (e) {
    console.error('YouTube playlist-items error', e);
    return res.status(500).json({ message: 'YouTube playlist fetch başarısız', error: e?.message });
  }
});

module.exports = router;
