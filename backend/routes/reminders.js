const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const Reminder = require('../models/Reminder');

router.use(authenticateToken);

// List reminders in date range
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    const query = { userId };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }
    const items = await Reminder.find(query).sort({ date: 1, createdAt: -1 }).lean();
    return res.json({ message: 'Reminders', data: items });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Create reminder
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { date, text, subject } = req.body || {};
    if (!date || !text) return res.status(400).json({ message: 'date ve text gerekli' });
    const day = new Date(date);
    const doc = await Reminder.create({ userId, date: day, text: text.trim(), subject: subject?.trim() });
    return res.status(201).json({ message: 'Reminder oluşturuldu', data: doc });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Update reminder
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id;
    const { text, subject, isDone, date } = req.body || {};
    const doc = await Reminder.findOne({ _id: id, userId });
    if (!doc) return res.status(404).json({ message: 'Reminder bulunamadı' });
    if (text !== undefined) doc.text = text.trim();
    if (subject !== undefined) doc.subject = subject?.trim();
    if (typeof isDone === 'boolean') doc.isDone = isDone;
    if (date) doc.date = new Date(date);
    await doc.save();
    return res.json({ message: 'Güncellendi', data: doc });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Delete reminder
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id;
    const doc = await Reminder.findOneAndDelete({ _id: id, userId });
    if (!doc) return res.status(404).json({ message: 'Reminder bulunamadı' });
    return res.json({ message: 'Silindi', data: { id } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

module.exports = router;
