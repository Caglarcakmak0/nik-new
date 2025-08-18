const express = require("express");
const router = express.Router();
const authenticateToken = require("../auth.js");

// Ek route: Kullanıcının kendi stats'ını getir (liderlik metriklerine göre)
router.get("/user-stats", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const UserStats = require('../models/UserStats');
        const Achievement = require('../models/Achievement');
        const StudySession = require('../models/StudySession');
        const PracticeExam = require('../models/PracticeExam');
        
        // Kullanıcının stats'ını getir
        let userStats = await UserStats.findOne({ userId }).populate('userId', 'firstName lastName email avatar');
        
        if (!userStats) {
            userStats = await UserStats.create({
                userId,
                totalXP: 0,
                currentLevel: 1,
                nextLevelXP: 1000,
                currentLevelXP: 0,
                streak: 0,
                maxStreak: 0,
                totalAchievements: 0,
                weeklyXP: 0,
                monthlyXP: 0,
                dailyChallenges: []
            });
            
            userStats = await UserStats.findById(userStats._id).populate('userId', 'firstName lastName email avatar');
        }
        
        // Overall agregasyon: tüm kullanıcılar için topla ve sırala (rank için)
        const sessionsAgg = await StudySession.aggregate([
            { $group: { 
                _id: '$userId', 
                totalStudyTime: { $sum: '$duration' },
                totalQuestions: { 
                    $sum: { 
                        $add: [
                            { $ifNull: [ '$questionStats.correctAnswers', 0 ] },
                            { $ifNull: [ '$questionStats.wrongAnswers', 0 ] },
                            { $ifNull: [ '$questionStats.blankAnswers', 0 ] }
                        ]
                    }
                }
            } }
        ]);
        const examsAgg = await PracticeExam.aggregate([
            { $group: { _id: '$userId', totalExamNet: { $sum: '$totals.net' } } }
        ]);

        const map = new Map();
        sessionsAgg.forEach(s => {
            map.set(String(s._id), { userId: String(s._id), totalStudyTime: s.totalStudyTime || 0, totalQuestions: s.totalQuestions || 0, totalExamNet: 0 });
        });
        examsAgg.forEach(e => {
            const key = String(e._id);
            const cur = map.get(key) || { userId: key, totalStudyTime: 0, totalQuestions: 0, totalExamNet: 0 };
            cur.totalExamNet = (cur.totalExamNet || 0) + (e.totalExamNet || 0);
            map.set(key, cur);
        });
        const entries = Array.from(map.values()).map(v => ({
            ...v,
            _primaryScore: v.totalStudyTime || 0,
            _secondaryScore: (v.totalQuestions || 0) + Math.round(v.totalExamNet || 0),
            periodScore: (v.totalStudyTime || 0) + ((v.totalQuestions || 0) + Math.round(v.totalExamNet || 0))
        }));
        entries.sort((a, b) => {
            if (b._primaryScore !== a._primaryScore) return b._primaryScore - a._primaryScore;
            return b._secondaryScore - a._secondaryScore;
        });
        const selfIndex = entries.findIndex(e => e.userId === String(userId));
        const selfAgg = selfIndex >= 0 ? entries[selfIndex] : { totalStudyTime: 0, totalQuestions: 0, totalExamNet: 0, periodScore: 0 };
        
        // Kullanıcının achievement'larını getir
        const achievements = await Achievement.find({ 
            userId, 
            unlockedAt: { $ne: null } 
        });
        
        const formattedAchievements = achievements.map(ach => ({
            id: ach._id.toString(),
            title: ach.title,
            description: ach.description,
            icon: ach.icon,
            rarity: ach.rarity,
            unlockedAt: ach.unlockedAt,
            points: ach.points
        }));
        
        const result = {
            _id: userStats.userId._id.toString(),
            name: `${userStats.userId.firstName || ''} ${userStats.userId.lastName || ''}`.trim() || 'Kullanıcı',
            totalScore: selfAgg.periodScore || 0,
            totalQuestions: selfAgg.totalQuestions || 0,
            totalStudyTime: selfAgg.totalStudyTime || 0,
            streak: userStats.streak || 0,
            level: userStats.currentLevel || 1,
            experience: userStats.totalXP || 0,
            achievements: formattedAchievements,
            weeklyScore: 0,
            monthlyScore: 0,
            rank: selfIndex >= 0 ? (selfIndex + 1) : entries.length + 1,
            weeklyRank: selfIndex >= 0 ? (selfIndex + 1) : entries.length + 1,
            monthlyRank: selfIndex >= 0 ? (selfIndex + 1) : entries.length + 1
        };
        
        res.status(200).json({
            message: "Kullanıcı istatistikleri başarıyla getirildi",
            data: result
        });
        
    } catch (error) {
        console.error('GET /leaderboard/user-stats error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Competitions endpoint
router.get("/competitions/active", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const Competition = require('../models/Competition');
        
        // Aktif yarışmaları getir
        const competitions = await Competition.find({ 
            status: 'active',
            endDate: { $gt: new Date() }
        }).populate('createdBy', 'name');
        
        const formattedCompetitions = competitions.map(comp => ({
            id: comp._id.toString(),
            title: comp.title,
            description: comp.description,
            type: comp.type,
            startDate: comp.startDate,
            endDate: comp.endDate,
            participants: comp.participants.length,
            prizes: comp.prizes.map(prize => ({
                position: 1,
                title: prize.name,
                description: prize.description,
                points: parseInt(prize.value) || 100
            })),
            isActive: comp.status === 'active',
            isJoined: comp.participants.includes(userId)
        }));
        
        res.status(200).json({
            message: "Aktif yarışmalar başarıyla getirildi",
            data: formattedCompetitions
        });
        
    } catch (error) {
        console.error('GET /leaderboard/competitions/active error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /leaderboard/:period - Liderlik tablosu getir
router.get("/:period", authenticateToken, async (req, res) => {
    try {
        const { period } = req.params; // overall, weekly, monthly
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }

        const UserStats = require('../models/UserStats');
        const Users = require('../models/Users');
        const StudySession = require('../models/StudySession');
        const PracticeExam = require('../models/PracticeExam');
        const Achievement = require('../models/Achievement');

        // Tarih aralığı belirleyici
        const getPeriodRange = (p) => {
            const now = new Date();
            if (p === 'weekly') {
                const start = new Date(now);
                // Haftanın başı (Pazartesi)
                const day = start.getDay() || 7; // Pazar 7
                start.setDate(start.getDate() - (day - 1));
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                return { start, end };
            }
            if (p === 'monthly') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date();
                return { start, end };
            }
            return { start: null, end: null }; // overall
        };

        const { start, end } = getPeriodRange(period);

        const sessionMatch = start && end ? { date: { $gte: start, $lt: end } } : {};
        const examMatch = start && end ? { date: { $gte: start, $lt: end } } : {};

        // StudySession agregasyonları: toplam süre ve toplam soru
        const sessionsAgg = await StudySession.aggregate([
            { $match: sessionMatch },
            { $group: { 
                _id: '$userId', 
                totalStudyTime: { $sum: '$duration' },
                totalQuestions: { 
                    $sum: { 
                        $add: [
                            { $ifNull: [ '$questionStats.correctAnswers', 0 ] },
                            { $ifNull: [ '$questionStats.wrongAnswers', 0 ] },
                            { $ifNull: [ '$questionStats.blankAnswers', 0 ] }
                        ]
                    }
                }
            } }
        ]);

        // PracticeExam agregasyonu: toplam net
        const examsAgg = await PracticeExam.aggregate([
            { $match: examMatch },
            { $group: { _id: '$userId', totalExamNet: { $sum: '$totals.net' } } }
        ]);

        // Kullanıcı bazında birleştir
        const userIdToStats = new Map();
        sessionsAgg.forEach((s) => {
            userIdToStats.set(String(s._id), {
                userId: String(s._id),
                totalStudyTime: s.totalStudyTime || 0,
                totalQuestions: s.totalQuestions || 0,
                totalExamNet: 0
            });
        });
        examsAgg.forEach((e) => {
            const key = String(e._id);
            const current = userIdToStats.get(key) || { userId: key, totalStudyTime: 0, totalQuestions: 0, totalExamNet: 0 };
            current.totalExamNet = (current.totalExamNet || 0) + (e.totalExamNet || 0);
            userIdToStats.set(key, current);
        });

        const allUserIds = Array.from(userIdToStats.keys());
        if (allUserIds.length === 0) {
            return res.status(200).json({ message: 'Leaderboard başarıyla getirildi', data: [] });
        }

        // Kullanıcıların seviye/streak bilgileri ve isimleri
        const statsDocs = await UserStats.find({ userId: { $in: allUserIds } }).populate('userId', 'firstName lastName email avatar');
        const userIdToUserStats = new Map(statsDocs.map(doc => [ String(doc.userId._id), doc ]));

        // Her kullanıcı için skor hesapla ve achievements'ları getir
        const entries = await Promise.all(allUserIds.map(async (uid) => {
            const agg = userIdToStats.get(uid);
            const stats = userIdToUserStats.get(uid);

            // Birincil sıralama: toplam çalışma süresi (dakika)
            const primaryScore = agg.totalStudyTime || 0;
            // İkincil sıralama: toplam soru + deneme neti
            const secondaryScore = (agg.totalQuestions || 0) + Math.round(agg.totalExamNet || 0);

            const achievements = await Achievement.find({ userId: uid, unlockedAt: { $ne: null } }).limit(5);
            const formattedAchievements = achievements.map(ach => ({
                id: ach._id.toString(),
                title: ach.title,
                description: ach.description,
                icon: ach.icon,
                rarity: ach.rarity,
                unlockedAt: ach.unlockedAt,
                points: ach.points
            }));

            const userDoc = stats?.userId;
            const fullName = userDoc ? (`${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || userDoc.email || 'Kullanıcı') : 'Kullanıcı';

            // Aktif tabın beklentisine göre skor alanları
            const periodScore = primaryScore + secondaryScore; // Görselde tek puan göstermek için

            return {
                _id: uid,
                name: fullName,
                avatar: userDoc?.avatar,
                totalScore: period === 'overall' ? periodScore : 0,
                totalQuestions: agg.totalQuestions || 0,
                totalStudyTime: agg.totalStudyTime || 0,
                totalExamNet: Math.round((agg.totalExamNet || 0) * 100) / 100,
                streak: stats?.streak || 0,
                level: stats?.currentLevel || 1,
                experience: stats?.totalXP || 0,
                achievements: formattedAchievements,
                weeklyScore: period === 'weekly' ? periodScore : 0,
                monthlyScore: period === 'monthly' ? periodScore : 0,
                // rank bilgisi sıralama sonrası eklenecek
                _primaryScore: primaryScore,
                _secondaryScore: secondaryScore
            };
        }));

        // Sıralama: önce çalışma süresi, sonra (soru + net)
        entries.sort((a, b) => {
            if (b._primaryScore !== a._primaryScore) return b._primaryScore - a._primaryScore;
            return b._secondaryScore - a._secondaryScore;
        });

        // Rank ata ve geçici alanları temizle
        const leaderboard = entries.slice(0, 50).map((e, index) => ({
            _id: e._id,
            name: e.name,
            avatar: e.avatar,
            totalScore: e.totalScore,
            totalQuestions: e.totalQuestions,
            totalStudyTime: e.totalStudyTime,
            streak: e.streak,
            level: e.level,
            experience: e.experience,
            achievements: e.achievements,
            weeklyScore: e.weeklyScore,
            monthlyScore: e.monthlyScore,
            rank: index + 1,
            weeklyRank: index + 1,
            monthlyRank: index + 1
        }));

        res.status(200).json({
            message: "Leaderboard başarıyla getirildi",
            data: leaderboard
        });
        
    } catch (error) {
        console.error('GET /leaderboard error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;