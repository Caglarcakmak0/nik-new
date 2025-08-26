const express = require("express");
const router = express.Router();
const authenticateToken = require("../auth.js");
const UserStats = require("../models/UserStats.js");
const StudySession = require("../models/StudySession.js");
const DailyPlan = require("../models/DailyPlan.js");
const UserDailyChallenge = require('../models/UserDailyChallenge');
const { getOrGenerate, claim: claimChallenge } = require('../services/dailyChallengeService');
const Achievement = require('../models/Achievement');
const XPEvent = require('../models/XPEvent.js');

// GET /gamification/user-stats - Kullanıcının gamification istatistikleri
router.get("/user-stats", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // UserStats'ı database'den getir
    let userStats = await UserStats.findOne({ userId });
        
        // Eğer yoksa, yeni oluştur
        if (!userStats) {
            // Kullanıcının mevcut verilerinden istatistik hesapla
            const studySessions = await StudySession.find({ userId });
            const dailyPlans = await DailyPlan.find({ userId });
            
            const totalStudyTime = studySessions.reduce((sum, session) => sum + (session.duration || 0), 0);
            const totalQuestions = studySessions.reduce((sum, session) => {
                const stats = session.questionStats;
                return sum + (stats ? (stats.correctAnswers + stats.wrongAnswers + stats.blankAnswers) : 0);
            }, 0);
            
            const totalXP = Math.floor(totalStudyTime / 60) * 20 + totalQuestions * 5; // Basit XP hesaplama
            const currentLevel = Math.floor(totalXP / 1000) + 1;
            
            userStats = new UserStats({
                userId,
                totalXP,
                currentLevel,
                nextLevelXP: totalXP, // placeholder threshold (will be recalculated when xpService runs)
                currentLevelXP: 0,
                streak: 0, // Gerçek hesaplama yapılacak
                maxStreak: 0,
                totalAchievements: 0,
                weeklyXP: Math.floor(totalXP * 0.3), // Son haftalık XP tahmini
                monthlyXP: Math.floor(totalXP * 0.7), // Son aylık XP tahmini
                dailyChallenges: [
                    {
                        id: 'daily_study',
                        title: 'Günlük Çalışma',
                        description: '2 saat çalış',
                        target: 120,
                        current: Math.floor(Math.random() * 120),
                        xpReward: 100,
                        isCompleted: false,
                        category: 'study',
                        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    },
                    {
                        id: 'daily_questions',
                        title: 'Günlük Sorular',
                        description: '50 soru çöz',
                        target: 50,
                        current: Math.floor(Math.random() * 50),
                        xpReward: 75,
                        isCompleted: false,
                        category: 'questions',
                        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    }
                ]
            });
            
            await userStats.save();
        }
        
        res.status(200).json({
            message: "Kullanıcı istatistikleri başarıyla getirildi",
            data: userStats
        });
        
    } catch (error) {
        console.error('GET /gamification/user-stats error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /gamification/xp-events - XP event feed
router.get('/xp-events', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
        const { limit = 50, offset = 0, type } = req.query;
        const q = { userId };
        if (type) q.type = type;
        const events = await XPEvent.find(q)
            .sort({ createdAt: -1 })
            .skip(Number(offset))
            .limit(Math.min(Number(limit), 100));
        res.status(200).json({
            message: 'XP events fetched',
            data: events.map(e => ({
                id: e._id,
                type: e.type,
                amount: e.amount,
                createdAt: e.createdAt,
                meta: e.meta
            }))
        });
    } catch (err) {
        console.error('GET /gamification/xp-events error:', err);
        res.status(500).json({ message: err.message });
    }
});

// GET /gamification/daily-challenges
router.get('/daily-challenges', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
        const doc = await getOrGenerate(userId);
        res.status(200).json({ message: 'Challenges', data: doc });
    } catch (e) {
        console.error('GET /gamification/daily-challenges error:', e);
        res.status(500).json({ message: e.message });
    }
});

// POST /gamification/claim-challenge
router.post('/claim-challenge', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { key } = req.body;
        if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
        if (!key) return res.status(400).json({ message: 'key required' });
        const result = await claimChallenge(userId, key);
        if (result.error) return res.status(400).json({ message: result.error });
        // Award XP
        const { addXP } = require('../services/xpService');
        await addXP(userId, result.challenge.xpReward, 'daily_challenge_claim', { key });
        res.status(200).json({ message: 'Claimed', data: result.challenge });
    } catch (e) {
        console.error('POST /gamification/claim-challenge error:', e);
        res.status(500).json({ message: e.message });
    }
});

// GET /gamification/overview - aggregate
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
        const [stats, events, challenges, recentAchievements] = await Promise.all([
            UserStats.findOne({ userId }),
            XPEvent.find({ userId }).sort({ createdAt: -1 }).limit(10),
            getOrGenerate(userId),
            Achievement.find({ userId, unlockedAt: { $ne: null } }).sort({ unlockedAt: -1 }).limit(5)
        ]);
        res.status(200).json({
            message: 'Overview',
            data: {
                stats,
                events: events.map(e => ({ id: e._id, type: e.type, amount: e.amount, createdAt: e.createdAt, meta: e.meta })),
                challenges,
                recentAchievements: recentAchievements.map(a => ({ id: a._id, title: a.title, points: a.points, unlockedAt: a.unlockedAt, icon: a.icon, rarity: a.rarity }))
            }
        });
    } catch (e) {
        console.error('GET /gamification/overview error:', e);
        res.status(500).json({ message: e.message });
    }
});

// POST /gamification/update-xp - XP güncelle
router.post("/update-xp", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { xpGained, source, details } = req.body;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        if (!xpGained || xpGained <= 0) {
            return res.status(400).json({ message: 'Geçerli XP miktarı giriniz' });
        }
        
        // UserStats'ı bul veya oluştur
        let userStats = await UserStats.findOne({ userId });
        if (!userStats) {
            userStats = new UserStats({ userId });
        }
        
        // XP ekle
        const oldLevel = userStats.currentLevel;
        userStats.totalXP += xpGained;
        userStats.weeklyXP += xpGained;
        userStats.monthlyXP += xpGained;
        
        // Level hesapla
        const newLevel = Math.floor(userStats.totalXP / 1000) + 1;
        const levelUp = newLevel > oldLevel;
        
        userStats.currentLevel = newLevel;
        userStats.nextLevelXP = newLevel * 1000;
        userStats.currentLevelXP = userStats.totalXP % 1000;
        
        await userStats.save();
        
        res.status(200).json({
            message: "XP başarıyla güncellendi",
            data: {
                xpGained,
                totalXP: userStats.totalXP,
                currentLevel: userStats.currentLevel,
                levelUp,
                source,
                details
            }
        });
        
    } catch (error) {
        console.error('POST /gamification/update-xp error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /gamification/xp-history - XP geçmişi
router.get("/xp-history", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // XP geçmişi için StudySessions'ları kullan
        const recentSessions = await StudySession.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20);
        
        const xpHistory = recentSessions.map(session => {
            const questionsCount = session.questionStats ? 
                (session.questionStats.correctAnswers + session.questionStats.wrongAnswers + session.questionStats.blankAnswers) : 0;
            const studyXP = Math.floor((session.duration || 0) / 60) * 20;
            const questionXP = questionsCount * 5;
            
            return {
                date: session.createdAt,
                action: 'Çalışma Oturumu',
                description: `${Math.floor((session.duration || 0) / 60)} dakika çalışma, ${questionsCount} soru`,
                xp: studyXP + questionXP,
                source: 'study_session'
            };
        });
        
        res.status(200).json({
            message: "XP geçmişi başarıyla getirildi",
            data: xpHistory
        });
        
    } catch (error) {
        console.error('GET /gamification/xp-history error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;