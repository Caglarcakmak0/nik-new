
const express = require("express");
const router = express.Router();
const authenticateToken = require('../auth.js');
const { checkRole } = require('../authRoles.js');
const StudySession = require("../models/StudySession.js");
const dotenv = require("dotenv");
dotenv.config();

router.post("/", authenticateToken, checkRole(['student', 'coach']), async (req, res) => {
  try {
    console.log('POST /study-sessions - req.user:', req.user);
    const {
      subject,
      duration,
      date,
      notes,
      quality,
      technique,
      mood,
      distractions,
      // YENİ ALANLAR - E-tablo entegrasyonu
      questionStats,
      intervals,
      dailyPlanId,
      liveTracking,
      tags
    } = req.body;

    // userId'yi token'dan al
    const userId = req.user?.userId;
    console.log('userId from token:', userId);

    const studySession = new StudySession({
      userId,
      subject,
      duration,
      date,
      notes,
      quality,
      technique,
      mood,
      distractions,
      // Yeni alanları ekle
      questionStats: questionStats || {},
      intervals: intervals || [],
      dailyPlanId: dailyPlanId || null,
      liveTracking: liveTracking || { isActive: false },
      tags: tags || []
    });
    
   const savedSession = await studySession.save();
    res.status(201).json({
        message: "Study session başarıyla kaydedildi",
        data: savedSession
    });
  } catch (error) {
    console.error('POST /study-sessions error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET - Kullanıcının tüm study sessions'ları
router.get("/", authenticateToken, checkRole(['student', 'coach']), async (req, res) => {
    try {
        console.log('GET /study-sessions - req.user:', req.user);
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const sessions = await StudySession.find({ userId }).sort({ date: -1 });
        console.log('Found sessions:', sessions.length);
        res.status(200).json(sessions);
    } catch (error) {
        console.error('GET /study-sessions error:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// PUT - Study session güncelle
router.put("/:id", authenticateToken, checkRole(['student', 'coach']), async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, duration, date, notes, quality, technique, mood, distractions } = req.body;
        const updatedSession = await StudySession.findByIdAndUpdate(id, { subject, duration, date, notes, quality, technique, mood, distractions }, { new: true });
        res.status(200).json(updatedSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Study session sil  
router.delete("/:id", authenticateToken, checkRole(['student', 'coach']), async (req, res) => {
    try {
        const { id } = req.params;
        await StudySession.findByIdAndDelete(id);
        res.status(200).json({ message: "Study session deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
