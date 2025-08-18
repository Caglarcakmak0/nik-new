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
        
        // User stats'larını al
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }

        // Son 7 günün çalışma verilerini al
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentSessions = await StudySession.find({
            userId: userId,
            date: { $gte: sevenDaysAgo }
        }).sort({ date: -1 });

        // Son 30 günün çalışma verilerini al
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const monthlySessions = await StudySession.find({
            userId: userId,
            date: { $gte: thirtyDaysAgo }
        });

        // Dashboard metrics hesapla
        const dashboardData = {
            // Ana kartlar
            overview: {
                totalStudyTime: user.stats.totalStudyTime || 0,
                currentStreak: user.stats.currentStreak || 0,
                activeGoals: user.targetUniversities ? user.targetUniversities.length : 0,
                profileCompleteness: user.profileCompleteness || 0
            },

            // Son 7 gün trendi
            weeklyTrend: {
                totalTime: recentSessions.reduce((sum, session) => sum + session.duration, 0),
                sessionCount: recentSessions.length,
                averageQuality: recentSessions.length > 0 
                    ? recentSessions.reduce((sum, session) => sum + session.quality, 0) / recentSessions.length 
                    : 0,
                averageEfficiency: recentSessions.length > 0
                    ? recentSessions.reduce((sum, session) => sum + session.efficiency, 0) / recentSessions.length
                    : 0
            },

            // Günlük çalışma dağılımı (son 7 gün)
            dailyDistribution: generateDailyDistribution(recentSessions),

            // Ders bazında dağılım (son 30 gün)
            subjectDistribution: generateSubjectDistribution(monthlySessions),

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
            recentActivity: recentSessions.slice(0, 5).map(session => ({
                date: session.date,
                subject: session.subject,
                duration: session.duration,
                quality: session.quality,
                mood: session.mood,
                efficiency: session.efficiency
            }))
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

// Detaylı İstatistikler
router.get("/detailed", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { period = '30', subject } = req.query;
        
        // Tarih aralığını belirle
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        
        // Query oluştur
        const query = {
            userId: userId,
            date: { $gte: daysAgo }
        };
        
        if (subject && subject !== 'all') {
            query.subject = subject;
        }

        const sessions = await StudySession.find(query).sort({ date: -1 });
        
        // Detaylı analiz
        const analysis = {
            totalSessions: sessions.length,
            totalTime: sessions.reduce((sum, s) => sum + s.duration, 0),
            averageDuration: sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length : 0,
            averageQuality: sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.quality, 0) / sessions.length : 0,
            averageEfficiency: sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.efficiency, 0) / sessions.length : 0,
            totalDistractions: sessions.reduce((sum, s) => sum + s.distractions, 0),
            
            // Haftalık breakdown
            weeklyBreakdown: generateWeeklyBreakdown(sessions),
            
            // En iyi ve en kötü günler
            bestDay: getBestDay(sessions),
            worstDay: getWorstDay(sessions),
            
            // Trend analizi
            trendAnalysis: calculateTrend(sessions)
        };

        res.status(200).json({
            message: "Detaylı istatistikler başarıyla getirildi",
            data: analysis
        });

    } catch (error) {
        console.error('Detailed analytics error:', error);
        res.status(500).json({ message: "Detaylı istatistikler alınamadı: " + error.message });
    }
});

// Hedef İlerlemesi
router.get("/goals-progress", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const goals = await StudyGoal.find({ userId: userId }).sort({ createdAt: -1 });
        
        const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
            // Bu hedef için son çalışmaları al
            const sessions = await StudySession.find({
                userId: userId,
                subject: goal.subject,
                date: { $gte: goal.startDate, $lte: goal.endDate }
            });
            
            const totalStudied = sessions.reduce((sum, s) => sum + s.duration, 0);
            const expectedTotal = goal.dailyTarget * goal.daysRemaining;
            
            return {
                ...goal.toObject(),
                actualProgress: totalStudied,
                expectedProgress: expectedTotal,
                isOnTrack: totalStudied >= expectedTotal * 0.8, // %80 tolerance
                recentSessions: sessions.slice(-5)
            };
        }));

        res.status(200).json({
            message: "Hedef ilerlemeleri başarıyla getirildi",
            data: goalsWithProgress
        });

    } catch (error) {
        console.error('Goals progress error:', error);
        res.status(500).json({ message: "Hedef ilerlemeleri alınamadı: " + error.message });
    }
});

// Helper Functions
function generateDailyDistribution(sessions) {
    const dailyData = {};
    const today = new Date();
    
    // Son 7 günü init et
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData[dateStr] = { totalTime: 0, sessionCount: 0, averageQuality: 0 };
    }
    
    // Sessions'ları günlere dağıt
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

function generateWeeklyBreakdown(sessions) {
    // Son 4 haftanın verilerini hesapla
    const weeks = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekSessions = sessions.filter(s => 
            s.date >= weekStart && s.date <= weekEnd
        );
        
        weeks.push({
            week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
            totalTime: weekSessions.reduce((sum, s) => sum + s.duration, 0),
            sessionCount: weekSessions.length,
            averageQuality: weekSessions.length > 0 
                ? weekSessions.reduce((sum, s) => sum + s.quality, 0) / weekSessions.length 
                : 0
        });
    }
    
    return weeks;
}

function getBestDay(sessions) {
    if (sessions.length === 0) return null;
    
    const dailyTotals = {};
    sessions.forEach(session => {
        const dateStr = session.date.toISOString().split('T')[0];
        if (!dailyTotals[dateStr]) {
            dailyTotals[dateStr] = { totalTime: 0, totalQuality: 0, count: 0 };
        }
        dailyTotals[dateStr].totalTime += session.duration;
        dailyTotals[dateStr].totalQuality += session.quality;
        dailyTotals[dateStr].count += 1;
    });
    
    let bestDay = null;
    let bestScore = 0;
    
    Object.keys(dailyTotals).forEach(date => {
        const data = dailyTotals[date];
        const score = data.totalTime * (data.totalQuality / data.count);
        if (score > bestScore) {
            bestScore = score;
            bestDay = { date, ...data, averageQuality: data.totalQuality / data.count };
        }
    });
    
    return bestDay;
}

function getWorstDay(sessions) {
    if (sessions.length === 0) return null;
    
    const dailyTotals = {};
    sessions.forEach(session => {
        const dateStr = session.date.toISOString().split('T')[0];
        if (!dailyTotals[dateStr]) {
            dailyTotals[dateStr] = { totalTime: 0, totalQuality: 0, count: 0 };
        }
        dailyTotals[dateStr].totalTime += session.duration;
        dailyTotals[dateStr].totalQuality += session.quality;
        dailyTotals[dateStr].count += 1;
    });
    
    let worstDay = null;
    let worstScore = Infinity;
    
    Object.keys(dailyTotals).forEach(date => {
        const data = dailyTotals[date];
        const score = data.totalTime * (data.totalQuality / data.count);
        if (score < worstScore) {
            worstScore = score;
            worstDay = { date, ...data, averageQuality: data.totalQuality / data.count };
        }
    });
    
    return worstDay;
}

function calculateTrend(sessions) {
    if (sessions.length < 2) return { direction: 'stable', percentage: 0 };
    
    const mid = Math.floor(sessions.length / 2);
    const firstHalf = sessions.slice(0, mid);
    const secondHalf = sessions.slice(mid);
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s.duration, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.duration, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
        direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
        percentage: Math.abs(change).toFixed(1)
    };
}

module.exports = router;