const express = require('express');
const router = express.Router();
const Motivation = require('../models/Motivation');

// ISO hafta/yıl hesapla
function getISOWeekYear(date = new Date()) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return { year: tmp.getUTCFullYear(), weekOfYear: weekNo };
}

/**
 * @openapi
 * /motivation/current:
 *   get:
 *     tags:
 *       - Public
 *     summary: Haftalık motivasyon sözünü getirir
 *     responses:
 *       200:
 *         description: Güncel motivasyon sözü
 */
router.get('/current', async (req, res) => {
  try {
    const { year, weekOfYear } = getISOWeekYear();
    let doc = await Motivation.findOne({ year, weekOfYear });

    if (!doc) {
      // En son aktif kayda geri düş
      doc = await Motivation.findOne({ isActive: true }).sort({ updatedAt: -1 });
    }

    if (!doc) {
      return res.json({
        message: 'Varsayılan motivasyon',
        data: {
          text: 'Başarı, küçük çabaların her gün tekrarlanmasının sonucudur.',
          author: 'Robert Collier',
          year,
          weekOfYear
        }
      });
    }

    return res.json({ message: 'Güncel motivasyon', data: doc });
  } catch (error) {
    console.error('GET /motivation/current error:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;


