const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const Notification = require('../models/Notification');

router.use(authenticateToken);

/**
 * GET /notifications
 * ?unreadOnly=true&limit=20&cursor=<createdAtISO>
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
    const cursor = req.query.cursor ? new Date(String(req.query.cursor)) : null;

    const query = { userId };
    if (unreadOnly) query.readAt = null;
    if (cursor && !isNaN(cursor.getTime())) query.createdAt = { $lt: cursor };

    const docs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt : null;

    return res.json({ message: 'Notifications', data: items, paging: { hasMore, nextCursor } });
  } catch (error) {
    console.error('GET /notifications error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /notifications/:id/read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id;
    const doc = await Notification.findOne({ _id: id, userId });
    if (!doc) return res.status(404).json({ message: 'Bildirim bulunamadı' });
    if (!doc.readAt) {
      doc.readAt = new Date();
      await doc.save();
    }
    return res.json({ message: 'Okundu', data: { id: doc._id, readAt: doc.readAt } });
  } catch (error) {
    console.error('POST /notifications/:id/read error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * POST /notifications/read-all
 */
router.post('/read-all', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const result = await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
    return res.json({ message: 'Tümü okundu', data: { modified: result.modifiedCount } });
  } catch (error) {
    console.error('POST /notifications/read-all error:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;


