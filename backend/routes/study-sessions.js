
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

        // Gamification side-effects (non-blocking best-effort)
        try {
            const { addXP } = require('../services/xpService');
            const { applySessionProgress } = require('../services/achievementProgressService');
            // XP hesaplama basit (ileride geliştirilebilir)
                    const formula = require('../services/xpFormula');
                    const durationXP = Math.round((savedSession.duration || 0) * formula.STUDY_MINUTE_XP);
                    let questionXP = 0;
                    if (savedSession.questionStats) {
                        const correct = (savedSession.questionStats.correctAnswers || 0);
                        const wrong = (savedSession.questionStats.wrongAnswers || 0);
                        const blank = (savedSession.questionStats.blankAnswers || 0);
                        questionXP = correct * formula.QUESTION_CORRECT_XP + wrong * formula.QUESTION_WRONG_XP + blank * formula.QUESTION_BLANK_XP;
                    }
            const totalXP = durationXP + questionXP;
            if (totalXP > 0) {
                await addXP(userId, totalXP, 'study_session', { sessionId: savedSession._id, duration: savedSession.duration });
            }
            const unlocked = await applySessionProgress(userId, savedSession);
                    // Daily challenges progress
                    const { incrementProgress } = require('../services/dailyChallengeService');
                    const progressUpdates = [];
                    if (savedSession.duration) progressUpdates.push({ key: 'daily_study_minutes', value: savedSession.duration });
                    if (savedSession.questionStats) {
                        const qs = (savedSession.questionStats.correctAnswers || 0) + (savedSession.questionStats.wrongAnswers || 0) + (savedSession.questionStats.blankAnswers || 0);
                        if (qs) progressUpdates.push({ key: 'daily_questions', value: qs });
                    }
                    if (progressUpdates.length) await incrementProgress(userId, progressUpdates);
            if (unlocked.length) {
                // Update UserStats totalAchievements
                const UserStats = require('../models/UserStats');
                await UserStats.updateOne({ userId }, { $inc: { totalAchievements: unlocked.length } });
            }
        } catch (e) {
            console.error('Gamification side-effect error:', e);
        }

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
