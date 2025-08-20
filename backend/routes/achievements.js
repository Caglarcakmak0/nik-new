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
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // Kullanıcının achievement'larını database'den getir
        const userAchievements = await Achievement.find({ userId });
        
        // Eğer kullanıcının achievement'ı yoksa, default achievement'ları oluştur
        if (userAchievements.length === 0) {
            const defaultAchievements = [
                {
                    userId,
                    title: 'İlk Adım',
                    description: 'İlk çalışma oturumunu tamamladın!',
                    icon: 'star',
                    category: 'study',
                    rarity: 'common',
                    points: 50
                },
                {
                    userId,
                    title: 'Sürekli Çalışan',
                    description: '7 gün üst üste çalış',
                    icon: 'fire',
                    category: 'streak',
                    rarity: 'rare',
                    points: 150
                },
                {
                    userId,
                    title: 'Soru Makinesi',
                    description: '1000 soru çöz',
                    icon: 'target',
                    category: 'questions',
                    rarity: 'epic',
                    points: 500
                }
            ];
            
            const createdAchievements = await Achievement.insertMany(defaultAchievements);
            
            // Achievement'ları frontend formatına çevir
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
                progress: achievement.unlockedAt ? 100 : 0,
                requirement: {
                    type: achievement.category,
                    target: achievement.category === 'study' ? 1 : achievement.category === 'streak' ? 7 : 1000,
                    current: achievement.unlockedAt ? (achievement.category === 'study' ? 1 : achievement.category === 'streak' ? 7 : 1000) : 0
                }
            }));
            
            return res.status(200).json({
                message: "Achievement'lar başarıyla getirildi",
                data: formattedAchievements
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
            progress: achievement.unlockedAt ? 100 : Math.random() * 80, // Gerçek progress hesaplaması yapılacak
            requirement: {
                type: achievement.category,
                target: achievement.category === 'study' ? 1 : achievement.category === 'streak' ? 7 : 1000,
                current: achievement.unlockedAt ? (achievement.category === 'study' ? 1 : achievement.category === 'streak' ? 7 : 1000) : Math.floor(Math.random() * 500)
            }
        }));
        
        res.status(200).json({
            message: "Achievement'lar başarıyla getirildi",
            data: formattedAchievements
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