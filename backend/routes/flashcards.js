const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth.js');
const { checkRole } = require('../authRoles.js');
const Flashcard = require('../models/Flashcard.js');

// CREATE flashcard
router.post('/', authenticateToken, checkRole(['student','coach']), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { subject, topic, question, answer, tags, difficulty } = req.body;
    const card = await Flashcard.create({
      userId,
      subject,
      topic,
      question,
      answer,
      tags: tags || [],
      stats: { difficulty: difficulty || 3 }
    });
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LIST (optional filters: topic, subject, q search)
router.get('/', authenticateToken, checkRole(['student','coach']), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { topic, subject, search } = req.query;
    const filter = { userId };
    if (topic) filter.topic = topic;
    if (subject) filter.subject = subject;
    if (search) {
      filter.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } }
      ];
    }
    const cards = await Flashcard.find(filter).sort({ updatedAt: -1 }).limit(1000);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
router.put('/:id', authenticateToken, checkRole(['student','coach']), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { subject, topic, question, answer, tags, difficulty, isActive } = req.body;
    const card = await Flashcard.findOneAndUpdate(
      { _id: id, userId },
      { subject, topic, question, answer, tags, 'stats.difficulty': difficulty, isActive },
      { new: true }
    );
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', authenticateToken, checkRole(['student','coach']), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const card = await Flashcard.findOneAndDelete({ _id: id, userId });
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PRACTICE - rastgele kartlar (topic bazlı) - query: topic, limit (default 10)
router.get('/practice/random', authenticateToken, checkRole(['student','coach']), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { topic, limit = 10 } = req.query;
    if (!topic) return res.status(400).json({ message: 'topic gerekli' });
    const lim = Math.min(parseInt(limit, 10) || 10, 50);
    const pipeline = [
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId), topic, isActive: true } },
      { $sample: { size: lim } }
    ];
    const cards = await Flashcard.aggregate(pipeline);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PRACTICE RESULT - kullanıcı bir kartı cevapladı (body: correct: boolean)
router.post('/:id/practice', authenticateToken, checkRole(['student','coach']), async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { correct } = req.body;
    const card = await Flashcard.findOne({ _id: id, userId });
    if (!card) return res.status(404).json({ message: 'Card not found' });
    card.stats.timesShown += 1;
    if (correct) card.stats.timesCorrect += 1;
    card.stats.lastReviewedAt = new Date();
    // Basit scheduling: doğruysa +2 gün, yanlışsa +1 gün (ileride SM2 vs.)
    const addDays = correct ? 2 : 1;
    card.stats.nextReviewAt = new Date(Date.now() + addDays * 24*60*60*1000);
    await card.save();
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
