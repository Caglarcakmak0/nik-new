/**
 * AI Routes
 * POST /api/ai/chat  -> { message } returns AI answer with optional user context
 */
const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { rateLimiter } = require('../middlewares/rateLimiter');
const { generateAnswer } = require('../services/aiService');
const StudySession = require('../models/StudySession');
const Users = require('../models/Users');
const StudyGoal = require('../models/StudyGoal');
const DailyPlan = require('../models/DailyPlan');
const Achievement = require('../models/Achievement');
const UserStats = require('../models/UserStats');
const ExamAttempt = require('../models/ExamAttempt');

// Light rate limit (per user) e.g. 30 req / 5 min
router.use(rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  key: (req)=> req.user?.userId || req.ip,
  id: 'ai-chat'
}));

router.post('/chat', authenticateToken, async (req,res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'message gerekli' });
    }

    // Enhanced coaching context
    const userId = req.user.userId;
    const now = Date.now();
    const weekAgo = new Date(now - 7*24*60*60*1000);
    const monthAgo = new Date(now - 30*24*60*60*1000);

    // Parallel fetches
    const [ lastWeekSessions, activeGoals, todayPlan, achievements, stats, recentExams, user ] = await Promise.all([
      StudySession.find({ userId, date: { $gte: weekAgo }}).limit(400).lean(),
      StudyGoal.find({ userId, isActive: true }).limit(10).lean(),
      DailyPlan.findByUserAndDate ? DailyPlan.findByUserAndDate(userId, new Date()) : DailyPlan.findOne({ userId, date: { $gte: new Date(new Date().setHours(0,0,0,0)), $lte: new Date(new Date().setHours(23,59,59,999)) } }).lean(),
      Achievement.find({ userId }).sort({ unlockedAt: -1 }).limit(5).lean(),
      UserStats.findOne({ userId }).lean(),
      ExamAttempt.find({ userId, date: { $gte: monthAgo }}).sort({ date: -1 }).limit(5).lean(),
      Users.findById(userId).lean()
    ]);

    const totalMinutes7d = lastWeekSessions.reduce((a,s)=> a + (s.duration||0), 0);
    const avgQuality7d = lastWeekSessions.length ? +(lastWeekSessions.reduce((a,s)=> a + (s.quality||0),0)/ lastWeekSessions.length).toFixed(2) : 0;
    const subjectDur = {};
    lastWeekSessions.forEach(s => { subjectDur[s.subject] = (subjectDur[s.subject]||0) + s.duration; });
    const topSubjects = Object.entries(subjectDur).sort((a,b)=> b[1]-a[1]).slice(0,5).map(([k,v])=> `${k}:${v}dk`);
    const distractionsTotal = lastWeekSessions.reduce((a,s)=> a + (s.distractions||0),0);
    const pomodoroUsage = lastWeekSessions.filter(s=> s.technique==='Pomodoro').length;
    const techniqueDist = lastWeekSessions.reduce((acc,s)=>{ acc[s.technique]=(acc[s.technique]||0)+1; return acc; },{});

    // Goals brief
    const goalsBrief = activeGoals.map(g=> ({ subj: g.subject, daily: g.dailyTarget, weekly: g.weeklyTarget, progress: g.completionRate }));

    // Today plan summary
    let planSummary = null;
    if (todayPlan) {
      const completed = todayPlan.subjects.filter(s=> s.status==='completed').length;
      planSummary = {
        date: todayPlan.date,
        subjectsPlanned: todayPlan.subjects.length,
        completed,
        completionRate: todayPlan.stats?.completionRate || todayPlan.overallCompletionRate || 0,
        remainingMinutes: todayPlan.estimatedRemainingTime
      };
    }

    // Exam performance (recent)
    const examPerf = recentExams.map(e=> ({
      date: e.date,
      type: e.examType,
      net: e.totals?.net,
      accuracy: +(e.totals?.accuracy || 0).toFixed(2),
      weakSubjects: e.subjects
        .map(s=> ({ name: s.name, acc: (s.correct/(s.correct+s.wrong||1)) }))
        .sort((a,b)=> a.acc - b.acc)
        .slice(0,2)
        .map(s=> s.name)
    }));

    const recentWeakTopics = recentExams.flatMap(e=> (e.topics||[]).filter(t=> t.wrong >= 2).map(t=> t.topic)).slice(0,8);

    // Achievements recent
    const recentAch = achievements.map(a=> a.title);

    const userContext = {
      profile: {
        grade: user?.grade,
        field: user?.targetFieldType,
        targetUniversities: (user?.targetUniversities||[]).slice(0,2).map(u=> u.name)
      },
      study: {
        totalMinutes7d,
        avgQuality7d,
        topSubjects,
        distractionsTotal,
        techniques: techniqueDist,
        pomodoroUsage
      },
      goals: goalsBrief,
      planToday: planSummary,
      exams: examPerf,
      weakTopics: recentWeakTopics,
      achievements: recentAch,
      gamification: stats ? { level: stats.currentLevel, totalXP: stats.totalXP, streak: stats.streak } : null
    };

  const ai = await generateAnswer({ message, userContext });
    res.json(ai);
  } catch (e) {
    console.error('[ai/chat] error', e);
    res.status(500).json({ message: 'AI cevabı üretilemedi', error: e.message });
  }
});

module.exports = router;
