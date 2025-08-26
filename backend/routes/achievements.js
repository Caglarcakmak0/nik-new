const express = require("express");
const router = express.Router();
const authenticateToken = require("../auth.js");
const { checkRole } = require("../authRoles.js");
const Achievement = require("../models/Achievement.js");
const Notification = require('../models/Notification');

// GET /achievements/user - Kullanıcının achievement'larını getir
router.get("/user", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'User ID not found in token' });

        // Query filters
        const { category, rarity, unlocked, search, sort } = req.query;
        const filter = { userId };
        if (category) filter.category = category;
        if (rarity) filter.rarity = rarity;
        if (unlocked === 'true') filter.unlockedAt = { $ne: null };
        if (unlocked === 'false') filter.unlockedAt = null;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Base fetch
        let query = Achievement.find(filter);
        // Sorting options: newest, progress, rarity, title
        if (sort === 'newest') query = query.sort({ createdAt: -1 });
        else if (sort === 'rarity') query = query.sort({ rarity: 1, tier: 1 });
        else if (sort === 'title') query = query.sort({ title: 1 });
        else if (sort === 'progress') query = query.sort({ unlockedAt: 1, currentValue: -1 });

        const userAchievements = await query.exec();

        // Eğer hiç kayıt yoksa minimal default set üret
        if (userAchievements.length === 0 && !category && !rarity && !search) {
            const defaultAchievements = [
                {
                    userId,
                    title: 'İlk Adım',
                    description: 'İlk çalışma oturumunu tamamladın!',
                    icon: 'star',
                    category: 'study',
                    rarity: 'common',
                    points: 50,
                    seriesKey: 'first_session',
                    tier: 1,
                    progressType: 'count',
                    targetValue: 1,
                    currentValue: 0
                },
                {
                    userId,
                    title: 'Sürekli Çalışan',
                    description: '7 gün üst üste çalış',
                    icon: 'fire',
                    category: 'streak',
                    rarity: 'rare',
                    points: 150,
                    seriesKey: 'streak',
                    tier: 2,
                    progressType: 'streak',
                    targetValue: 7,
                    currentValue: 0
                },
                {
                    userId,
                    title: 'Soru Makinesi',
                    description: '1000 soru çöz',
                    icon: 'target',
                    category: 'questions',
                    rarity: 'epic',
                    points: 500,
                    seriesKey: 'questions_total',
                    tier: 3,
                    progressType: 'questions',
                    targetValue: 1000,
                    currentValue: 0
                }
            ];
            const createdAchievements = await Achievement.insertMany(defaultAchievements);
            const formattedAchievements = createdAchievements.map(achievement => ({
                id: achievement._id.toString(),
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon,
                category: achievement.category,
                rarity: achievement.rarity,
                points: achievement.points,
                isUnlocked: !!achievement.unlockedAt,
                unlockedAt: achievement.unlockedAt,
                progress: achievement.targetValue ? Math.min(100, Math.round((achievement.currentValue / achievement.targetValue) * 100)) : (achievement.unlockedAt ? 100 : 0),
                currentValue: achievement.unlockedAt ? achievement.targetValue : achievement.currentValue || 0,
                targetValue: achievement.targetValue || 0,
                progressType: achievement.progressType
            }));
            return res.status(200).json({
                message: "Achievement'lar başarıyla getirildi",
                data: formattedAchievements,
                stats: {
                    total: formattedAchievements.length,
                    unlocked: formattedAchievements.filter(a => a.isUnlocked).length,
                    completionRate: formattedAchievements.length ? Math.round((formattedAchievements.filter(a => a.isUnlocked).length / formattedAchievements.length) * 100) : 0,
                    byCategory: formattedAchievements.reduce((acc, a) => { acc[a.category] = (acc[a.category]||0)+1; return acc; }, {})
                }
            });
        }

        // Mevcut achievement'ları frontend formatına çevir
        const formattedAchievements = userAchievements.map(achievement => ({
            id: achievement._id.toString(),
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            category: achievement.category,
            rarity: achievement.rarity,
            points: achievement.points,
            isUnlocked: !!achievement.unlockedAt,
            unlockedAt: achievement.unlockedAt,
            progress: achievement.targetValue ? Math.min(100, Math.round((achievement.currentValue / achievement.targetValue) * 100)) : (achievement.unlockedAt ? 100 : 0),
            currentValue: achievement.unlockedAt ? achievement.targetValue : achievement.currentValue || 0,
            targetValue: achievement.targetValue || 0,
            progressType: achievement.progressType
        }));
        const unlockedCount = formattedAchievements.filter(a => a.isUnlocked).length;
        res.status(200).json({
            message: "Achievement'lar başarıyla getirildi",
            data: formattedAchievements,
            stats: {
                total: formattedAchievements.length,
                unlocked: unlockedCount,
                completionRate: formattedAchievements.length ? Math.round((unlockedCount / formattedAchievements.length)*100) : 0,
                byCategory: formattedAchievements.reduce((acc, a) => { acc[a.category] = (acc[a.category]||0)+1; return acc; }, {})
            }
        });
        
    } catch (error) {
        console.error('GET /achievements/user error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /achievements/unlock - Yeni achievement unlock et
router.post("/unlock", authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { achievementId } = req.body;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // Achievement'ı database'de bul
        const achievement = await Achievement.findOne({ 
            _id: achievementId, 
            userId: userId 
        });
        
        if (!achievement) {
            return res.status(404).json({ message: 'Achievement bulunamadı' });
        }
        
        // Zaten unlock edilmiş mi kontrol et
        if (achievement.unlockedAt) {
            return res.status(400).json({ message: 'Achievement zaten unlock edilmiş' });
        }
        
        // Achievement'ı unlock et
        achievement.unlockedAt = new Date();
        await achievement.save();
        
        // UserStats'ı güncelle (eğer varsa)
        const UserStats = require('../models/UserStats');
        const userStats = await UserStats.findOne({ userId });
        if (userStats) {
            userStats.totalAchievements += 1;
            userStats.totalXP += achievement.points;
            await userStats.save();
        }
        
        // In-app notification: achievement unlocked
        try {
            await Notification.create({
                userId,
                category: 'gamification',
                type: 'achievement_unlocked',
                title: `Yeni rozet: ${achievement.title}`,
                body: `Tebrikler! ${achievement.points} XP kazandın.`,
                actionUrl: '/study-plan/achievements',
                importance: 'normal',
                dedupeKey: `achievement_unlocked:${userId}:${achievement._id}`,
                meta: { achievementId: String(achievement._id), points: achievement.points }
            });
        } catch (e) {
            console.error('Achievement notification error:', e);
        }

        res.status(200).json({
            message: "Achievement başarıyla unlock edildi!",
            data: {
                achievementId: achievement._id,
                title: achievement.title,
                points: achievement.points,
                unlockedAt: achievement.unlockedAt
            }
        });
        
    } catch (error) {
        console.error('POST /achievements/unlock error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;