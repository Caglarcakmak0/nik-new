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
const DailyPlan = require("../models/DailyPlan.js");

// In-memory simple cache (key -> { expires:number, data:any })
const __advCache = new Map();

function cacheGet(key) {
    const entry = __advCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) { __advCache.delete(key); return null; }
    return entry.data;
}
function cacheSet(key, data, ttlMs = 5 * 60 * 1000) { // 5dk
    __advCache.set(key, { data, expires: Date.now() + ttlMs });
}

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

// ========== ADVANCED ANALYTICS (Aggregation) ==========
// GET /analytics/advanced?range=weekly&subjects=matematik,fizik&includeSessions=1
router.get('/advanced', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const range = (req.query.range || 'weekly').toString(); // daily|weekly|monthly
        const includeSessions = req.query.includeSessions === '1' || req.query.includeSessions === 'true';
        const subjectsFilter = (req.query.subjects || '').toString().trim();
        const subjectList = subjectsFilter ? subjectsFilter.split(',').map(s => s.trim()).filter(Boolean) : [];

        const now = new Date();
        let from = new Date();
        if (range === 'daily') from.setDate(now.getDate() - 0);
        else if (range === 'weekly') from.setDate(now.getDate() - 6);
        else if (range === 'monthly') from.setDate(now.getDate() - 29);
        else from.setDate(now.getDate() - 6); // default weekly window for chart size
        from.setHours(0,0,0,0);
        const to = new Date(); to.setHours(23,59,59,999);

        const cacheKey = `${userId}:${range}:${subjectList.sort().join('|')}:${includeSessions}`;
        const cached = cacheGet(cacheKey);
        if (cached) {
            return res.status(200).json({ message: 'Advanced analytics (cache)', data: cached });
        }

        // Base match
        const match = { userId, date: { $gte: from, $lte: to } };
        if (subjectList.length) match.subject = { $in: subjectList };

        // Fetch sessions (project only needed fields)
        const projection = {
            subject: 1,
            duration: 1,
            date: 1,
            quality: 1,
            technique: 1,
            efficiency: 1,
            distractions: 1,
            questionStats: 1
        };
        const sessions = await StudySession.find(match, projection).sort({ date: 1 }).lean();

        // Prepare maps
        const dayMap = new Map(); // dateStr -> { totalTime, sessionCount, qualitySum }
        const subjectMap = new Map(); // subject -> aggregate
        const techniqueMap = new Map(); // technique -> count

        let totalStudyTime = 0;
        let totalQualitySum = 0;
        let totalEfficiencySum = 0;
        let totalSessions = sessions.length;

        // Question stats summary
        let totalTargetQuestions = 0, totalCorrect = 0, totalWrong = 0, totalBlank = 0, completionRateSum = 0, completionCount = 0;

        sessions.forEach(s => {
            const dateStr = s.date.toISOString().split('T')[0];
            if (!dayMap.has(dateStr)) dayMap.set(dateStr, { totalTime: 0, sessionCount: 0, qualitySum: 0 });
            const dAgg = dayMap.get(dateStr);
            dAgg.totalTime += s.duration;
            dAgg.sessionCount += 1;
            dAgg.qualitySum += (s.quality || 0);

            totalStudyTime += s.duration;
            totalQualitySum += (s.quality || 0);
            totalEfficiencySum += (s.efficiency || 0);

            // Subject agg
            const subj = s.subject || 'diger';
            if (!subjectMap.has(subj)) subjectMap.set(subj, { subject: subj, totalTime: 0, sessionCount: 0, qualitySum: 0, efficiencySum: 0, correct: 0, wrong: 0, blank: 0 });
            const sAgg = subjectMap.get(subj);
            sAgg.totalTime += s.duration;
            sAgg.sessionCount += 1;
            sAgg.qualitySum += (s.quality || 0);
            sAgg.efficiencySum += (s.efficiency || 0);
            if (s.questionStats) {
                sAgg.correct += s.questionStats.correctAnswers || 0;
                sAgg.wrong += s.questionStats.wrongAnswers || 0;
                sAgg.blank += s.questionStats.blankAnswers || 0;
                totalTargetQuestions += s.questionStats.targetQuestions || 0;
                totalCorrect += s.questionStats.correctAnswers || 0;
                totalWrong += s.questionStats.wrongAnswers || 0;
                totalBlank += s.questionStats.blankAnswers || 0;
                if (typeof s.questionStats.completionRate === 'number') { completionRateSum += s.questionStats.completionRate; completionCount++; }
            }

            // Technique
            const tech = s.technique || 'Unknown';
            techniqueMap.set(tech, (techniqueMap.get(tech) || 0) + 1);
        });

        // Fetch daily plans in window for target alignment
        const plansInRange = await DailyPlan.find({ userId, date: { $gte: from, $lte: to } }).lean();
        const planDayMap = new Map(); // dateStr -> plan aggregate
        plansInRange.forEach(p => {
            const ds = new Date(p.date).toISOString().split('T')[0];
            planDayMap.set(ds, {
                targetQuestions: (p.stats && p.stats.totalTargetQuestions) || p.subjects?.reduce((sum,s)=> sum + (s.targetQuestions||0),0) || 0,
                targetTime: (p.stats && p.stats.totalTargetTime) || p.subjects?.reduce((sum,s)=> sum + (s.targetTime||0),0) || 0
            });
        });

        // Normalize day series across window
        const daySeries = [];
        const cursor = new Date(from);
        while (cursor <= to) {
            const ds = cursor.toISOString().split('T')[0];
            const entry = dayMap.get(ds) || { totalTime: 0, sessionCount: 0, qualitySum: 0 };
            const planTargets = planDayMap.get(ds) || { targetQuestions: 0, targetTime: 0 };
            daySeries.push({ date: ds, totalTime: entry.totalTime, sessionCount: entry.sessionCount, avgQuality: entry.sessionCount ? +(entry.qualitySum / entry.sessionCount).toFixed(2) : 0 });
            cursor.setDate(cursor.getDate() + 1);
        }

        // Subject stats array
        const subjectStats = Array.from(subjectMap.values()).map(v => ({
            subject: v.subject,
            totalTime: v.totalTime,
            sessionCount: v.sessionCount,
            avgQuality: v.sessionCount ? +(v.qualitySum / v.sessionCount).toFixed(2) : 0,
            avgEfficiency: v.sessionCount ? +(v.efficiencySum / v.sessionCount).toFixed(2) : 0,
            correctAnswers: v.correct,
            wrongAnswers: v.wrong,
            blankAnswers: v.blank
        })).sort((a,b) => b.totalTime - a.totalTime);

        const techniqueDistribution = Array.from(techniqueMap.entries()).map(([technique, count]) => ({ technique, count })).sort((a,b) => b.count - a.count);

        const totalAttempted = totalCorrect + totalWrong + totalBlank;
        const questionStatsSummary = {
            totalTargetQuestions,
            totalAttempted,
            totalCorrect,
            totalWrong,
            totalBlank,
            avgCompletionRate: completionCount ? +(completionRateSum / completionCount).toFixed(2) : 0,
            accuracyPercent: totalAttempted ? +( (totalCorrect / totalAttempted) * 100 ).toFixed(2) : 0
        };

        // Completion & consistency metrics using plans
        const totalTargetTimeWindow = plansInRange.reduce((sum,p)=> sum + (p.stats?.totalTargetTime || p.subjects?.reduce((s,sub)=> s + (sub.targetTime||0),0) || 0), 0);
        const totalTargetQuestionsWindow = plansInRange.reduce((sum,p)=> sum + (p.stats?.totalTargetQuestions || p.subjects?.reduce((s,sub)=> s + (sub.targetQuestions||0),0) || 0), 0);
        const completionTimePercent = totalTargetTimeWindow > 0 ? +( (totalStudyTime / totalTargetTimeWindow) * 100 ).toFixed(2) : 0;
        const completionQuestionPercent = totalTargetQuestionsWindow > 0 ? +( (totalAttempted / totalTargetQuestionsWindow) * 100 ).toFixed(2) : 0;
        const unifiedCompletionRate = totalTargetTimeWindow > 0 ? completionTimePercent : completionQuestionPercent;

        // ConsistencyScore: günlerin %'si (range window) içinde min %50 hedef gerçekleşmiş
        let consistentDays = 0; let totalDays = 0;
        const cursor2 = new Date(from);
        while (cursor2 <= to) {
            totalDays++;
            const ds = cursor2.toISOString().split('T')[0];
            const sessionsOfDay = sessions.filter(s => s.date.toISOString().split('T')[0] === ds);
            const dayStudy = sessionsOfDay.reduce((sum,s)=> sum + s.duration, 0);
            const planTargets = planDayMap.get(ds) || { targetTime: 0, targetQuestions: 0 };
            let achieved = false;
            if (planTargets.targetTime > 0) {
                achieved = dayStudy >= (planTargets.targetTime * 0.5);
            } else if (planTargets.targetQuestions > 0) {
                const dayQuestionsAttempted = sessionsOfDay.reduce((qsum,s)=> {
                    if (s.questionStats) return qsum + (s.questionStats.correctAnswers||0) + (s.questionStats.wrongAnswers||0) + (s.questionStats.blankAnswers||0);
                    return qsum;
                }, 0);
                achieved = dayQuestionsAttempted >= (planTargets.targetQuestions * 0.5);
            } else {
                // No targets -> count only if some activity
                achieved = dayStudy > 0;
            }
            if (achieved) consistentDays++;
            cursor2.setDate(cursor2.getDate() + 1);
        }
        const consistencyScore = totalDays ? +( (consistentDays / totalDays) * 100 ).toFixed(2) : 0;

        // FocusScore: en çok 3 derse ayrılan sürenin toplam süreye oranı (dağılım odaklılık)
        const subjectTimeSorted = Array.from(subjectMap.values()).map(v => v.totalTime).sort((a,b)=> b-a);
        const top3Time = subjectTimeSorted.slice(0,3).reduce((a,b)=> a+b, 0);
        const focusScore = totalStudyTime > 0 ? +( (top3Time / totalStudyTime) * 100 ).toFixed(2) : 0;

        // VelocityScore: completion * accuracy * (averageQuality / 5)
        const avgQualityOverall = totalSessions ? +(totalQualitySum / totalSessions).toFixed(2) : 0;
        const accuracyPercent = questionStatsSummary.accuracyPercent || 0;
        const velocityScore = +( (unifiedCompletionRate/100) * (accuracyPercent/100) * (avgQualityOverall/5) * 100 ).toFixed(2);

        const overall = {
            totalStudyTime,
            sessionCount: totalSessions,
            averageQuality: avgQualityOverall,
            averageEfficiency: totalSessions ? +(totalEfficiencySum / totalSessions).toFixed(2) : 0,
            completionRate: unifiedCompletionRate,
            consistencyScore,
            focusScore,
            velocityScore
        };

    const payload = {
            range,
            from: from.toISOString(),
            to: to.toISOString(),
            timeSeries: daySeries,
            subjectStats,
            techniqueDistribution,
            questionStatsSummary,
            overall,
            sessions: includeSessions ? sessions : undefined,
            meta: { generatedAt: new Date().toISOString() }
        };

        cacheSet(cacheKey, payload);

        return res.status(200).json({ message: 'Advanced analytics hazır', data: payload });
    } catch (e) {
        console.error('GET /analytics/advanced error:', e);
        return res.status(500).json({ message: 'Advanced analytics alınamadı: ' + e.message });
    }
});