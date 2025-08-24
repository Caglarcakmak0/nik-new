/**
 * ANALYTICS ROUTES - 📊 İstatistik & Dashboard API
 * 
 * Amaç: Dashboard verilerini sağlar, kullanıcı istatistiklerini hesaplar
 * 
 * Endpoints:
 * - GET /analytics/dashboard - Ana dashboard verileri (genel bakış, haftalık trend, aktif hedefler)
 * - GET /analytics/detailed - Detaylı istatistikler (tarih filtreli, konu bazlı)
 * - GET /analytics/goals-progress - Hedef ilerleme takibi ve streak hesaplamaları
 * 
 * Data Sources:
 * - StudySession: Çalışma oturumları
 * - Users: Profil tamamlanma, target universities
 * - StudyGoal: Çalışma hedefleri (ileride)
 */

const express = require("express");
const router = express.Router();
const authenticateToken = require('../auth.js');
const Users = require("../models/Users.js");
const StudySession = require("../models/StudySession.js");
const StudyGoal = require("../models/StudyGoal.js");

// Dashboard Ana İstatistikler
router.get("/dashboard", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const range = (req.query.range || 'weekly').toString(); // daily | weekly | monthly | all
        const rangeConfig = {
            daily: { days: 1 },
            weekly: { days: 7 },
            monthly: { days: 30 },
            all: { days: null }
        };
        const cfg = rangeConfig[range] || rangeConfig.weekly;
        
        // User stats'larını al
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }

        // Seçilen aralığın çalışma oturumlarını al (cfg.days null ise tümü)
        let rangeSessions;
        if (cfg.days) {
            const from = new Date();
            from.setDate(from.getDate() - cfg.days);
            rangeSessions = await StudySession.find({
                userId,
                date: { $gte: from }
            }).sort({ date: -1 });
        } else {
            rangeSessions = await StudySession.find({ userId }).sort({ date: -1 });
        }

        // Subject distribution için: monthly & all hariç 30 güne bak; monthly 30 gün; all tümü
        let subjectSessions;
        if (range === 'all') {
            subjectSessions = rangeSessions; // already all
        } else if (range === 'monthly') {
            subjectSessions = rangeSessions; // 30 gün
        } else {
            // weekly/daily -> son 30 gün yinele
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            subjectSessions = await StudySession.find({
                userId,
                date: { $gte: thirtyDaysAgo }
            });
        }

        // Dashboard metrics hesapla
        const dashboardData = {
            // Ana kartlar
            overview: {
                totalStudyTime: user.stats.totalStudyTime || 0,
                currentStreak: user.stats.currentStreak || 0,
                activeGoals: user.targetUniversities ? user.targetUniversities.length : 0,
                profileCompleteness: user.profileCompleteness || 0
            },

            // Seçilen aralık trendi (anahtar ismi backward compatibility için weeklyTrend tutuldu)
            weeklyTrend: {
                totalTime: rangeSessions.reduce((sum, session) => sum + session.duration, 0),
                sessionCount: rangeSessions.length,
                averageQuality: rangeSessions.length > 0 
                    ? rangeSessions.reduce((sum, session) => sum + session.quality, 0) / rangeSessions.length 
                    : 0,
                averageEfficiency: rangeSessions.length > 0
                    ? rangeSessions.reduce((sum, session) => sum + session.efficiency, 0) / rangeSessions.length
                    : 0
            },

            // Günlük çalışma dağılımı (seçilen aralık)
            dailyDistribution: generateDailyDistribution(rangeSessions, cfg.days),

            // Ders bazında dağılım
            subjectDistribution: generateSubjectDistribution(subjectSessions),

            // Ruh hali dağılımı
            moodDistribution: user.stats.moodStats?.moodDistribution || {},

            // Çalışma tekniği dağılımı  
            techniqueDistribution: user.stats.techniqueStats?.techniqueDistribution || {},

            // Aktif hedefler özeti (Target Universities'den)
            goalsOverview: user.targetUniversities ? user.targetUniversities.slice(0, 5).map((uni, index) => ({
                id: `target-${index}`,
                universityName: uni.name || 'Üniversite Belirtilmemiş',
                department: uni.department || 'Bölüm Belirtilmemiş',
                priority: uni.priority || (index + 1),
                progress: Math.floor(Math.random() * 100), // Geçici - gerçek progress hesaplama eklenecek
                streak: Math.floor(Math.random() * 30), // Geçici - gerçek streak hesaplama eklenecek
                daysRemaining: Math.max(30, 365 - (Math.floor(Math.random() * 200))), // Geçici
                image: uni.image || null // Kullanıcının yüklediği üniversite görseli
            })) : [],

            // Son aktiviteler
            recentActivity: rangeSessions.slice(0, 5).map(session => ({
                date: session.date,
                subject: session.subject,
                duration: session.duration,
                quality: session.quality,
                mood: session.mood,
                efficiency: session.efficiency
            })),
            range
        };

        res.status(200).json({
            message: "Dashboard verileri başarıyla getirildi",
            data: dashboardData
        });

    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({ message: "Dashboard verileri alınamadı: " + error.message });
    }
});

// UNUSED: Detaylı İstatistikler (devre dışı)
// router.get("/detailed", authenticateToken, async (req, res) => {
//   // disabled
//   return res.status(410).json({ message: 'Endpoint devre dışı' });
// });

// UNUSED: Hedef İlerlemesi (devre dışı)
// router.get("/goals-progress", authenticateToken, async (req, res) => {
//   // disabled
//   return res.status(410).json({ message: 'Endpoint devre dışı' });
// });

// Helper Functions
function generateDailyDistribution(sessions, days = 7) {
    const dailyData = {};
    const today = new Date();
    const window = days || 7; // default 7 if null (all -> show last 7 for chart simplicity)
    for (let i = window - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData[dateStr] = { totalTime: 0, sessionCount: 0, averageQuality: 0 };
    }
    sessions.forEach(session => {
        const dateStr = session.date.toISOString().split('T')[0];
        if (dailyData[dateStr]) {
            dailyData[dateStr].totalTime += session.duration;
            dailyData[dateStr].sessionCount += 1;
            dailyData[dateStr].averageQuality = (dailyData[dateStr].averageQuality + session.quality) / 2;
        }
    });
    return dailyData;
}

function generateSubjectDistribution(sessions) {
    const subjectData = {};
    
    sessions.forEach(session => {
        if (!subjectData[session.subject]) {
            subjectData[session.subject] = {
                totalTime: 0,
                sessionCount: 0,
                averageQuality: 0,
                totalEfficiency: 0
            };
        }
        
        subjectData[session.subject].totalTime += session.duration;
        subjectData[session.subject].sessionCount += 1;
        subjectData[session.subject].averageQuality = 
            (subjectData[session.subject].averageQuality + session.quality) / 2;
        subjectData[session.subject].totalEfficiency += session.efficiency;
    });
    
    // Average efficiency hesapla
    Object.keys(subjectData).forEach(subject => {
        subjectData[subject].averageEfficiency = 
            subjectData[subject].totalEfficiency / subjectData[subject].sessionCount;
    });
    
    return subjectData;
}

module.exports = router;