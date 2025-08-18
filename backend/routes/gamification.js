const express = require("express");
const router = express.Router();
const authenticateToken = require("../auth.js");
const UserStats = require("../models/UserStats.js");
const StudySession = require("../models/StudySession.js");
const DailyPlan = require("../models/DailyPlan.js");

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
                nextLevelXP: currentLevel * 1000,
                currentLevelXP: totalXP % 1000,
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