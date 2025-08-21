const express = require("express");
const router = express.Router();
const authenticateToken = require('../auth.js');
const { checkRole } = require('../authRoles.js');
const DailyPlan = require("../models/DailyPlan.js");
const StudySession = require("../models/StudySession.js");
const Notification = require('../models/Notification');
const Users = require('../models/Users');
const { requirePlan } = require('../middlewares/plan');

// GET - Kullanıcının günlük planları
router.get("/", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { date, status } = req.query;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        let query = { userId };
        
        // Date filter
        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }
        
        // Status filter
        if (status) {
            query.status = status;
        }
        
        const plans = await DailyPlan.find(query)
            .populate('subjects.sessionIds')
            .sort({ date: -1 });
            
        res.status(200).json({
            message: "Günlük planlar başarıyla getirildi",
            data: plans
        });
        
    } catch (error) {
        console.error('GET /daily-plans error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET - Belirli bir tarih için plan
router.get("/by-date/:date", authenticateToken, checkRole('student', 'coach', 'admin'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { date } = req.params;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const plan = await DailyPlan.findByUserAndDate(userId, new Date(date))
            .populate('subjects.sessionIds');
            
        if (!plan) {
            return res.status(404).json({ message: 'Bu tarih için plan bulunamadı' });
        }
        
        res.status(200).json({
            message: "Günlük plan başarıyla getirildi",
            data: plan
        });
        
    } catch (error) {
        console.error('GET /daily-plans/by-date error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST - Yeni günlük plan oluştur
router.post("/", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const planData = req.body;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        // Aynı tarih için plan var mı kontrol et
        const existingPlan = await DailyPlan.findByUserAndDate(userId, new Date(planData.date));
        if (existingPlan) {
            return res.status(400).json({ message: 'Bu tarih için zaten bir plan mevcut' });
        }
        
        const dailyPlan = new DailyPlan({
            ...planData,
            userId,
            status: 'active'
        });
        
        const savedPlan = await dailyPlan.save();
        
        res.status(201).json({
            message: "Günlük plan başarıyla oluşturuldu",
            data: savedPlan
        });
        
    } catch (error) {
        console.error('POST /daily-plans error:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT - Plan güncelle
router.put("/:id", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user?.userId;
        
        const plan = await DailyPlan.findOne({ _id: id, userId });
        if (!plan) {
            return res.status(404).json({ message: 'Plan bulunamadı veya erişim yetkiniz yok' });
        }
        
        const updatedPlan = await DailyPlan.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        ).populate('subjects.sessionIds');
        
        res.status(200).json({
            message: "Plan başarıyla güncellendi",
            data: updatedPlan
        });
        
    } catch (error) {
        console.error('PUT /daily-plans error:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT - Subject progress güncelle
router.put("/:id/subjects/:subjectIndex", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const { id, subjectIndex } = req.params;
        const { correctAnswers, wrongAnswers, blankAnswers, studyTime, status, notes } = req.body;
        const userId = req.user?.userId;
        
        const plan = await DailyPlan.findOne({ _id: id, userId });
        if (!plan) {
            return res.status(404).json({ message: 'Plan bulunamadı' });
        }
        
        if (!plan.subjects[subjectIndex]) {
            return res.status(404).json({ message: 'Ders bulunamadı' });
        }
        
        // Subject progress'i güncelle
        const subject = plan.subjects[subjectIndex];
        if (correctAnswers !== undefined) subject.correctAnswers = correctAnswers;
        if (wrongAnswers !== undefined) subject.wrongAnswers = wrongAnswers;
        if (blankAnswers !== undefined) subject.blankAnswers = blankAnswers;
        if (studyTime !== undefined) subject.studyTime = studyTime;
        if (status !== undefined) subject.status = status;

        
        // Toplam completed questions hesapla
        subject.completedQuestions = (correctAnswers || 0) + (wrongAnswers || 0) + (blankAnswers || 0);
        
        await plan.save();
        
        res.status(200).json({
            message: "Ders ilerlemesi başarıyla güncellendi",
            data: plan
        });
        
    } catch (error) {
        console.error('PUT /daily-plans/subjects error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST - Session'ı plan'a bağla
router.post("/:id/link-session", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionId, subjectIndex } = req.body;
        const userId = req.user?.userId;
        
        const plan = await DailyPlan.findOne({ _id: id, userId });
        if (!plan) {
            return res.status(404).json({ message: 'Plan bulunamadı' });
        }
        
        const session = await StudySession.findById(sessionId);
        if (!session || session.userId.toString() !== userId) {
            return res.status(404).json({ message: 'Session bulunamadı' });
        }
        
        // Session'ı subject'e bağla
        if (plan.subjects[subjectIndex]) {
            if (!plan.subjects[subjectIndex].sessionIds.includes(sessionId)) {
                plan.subjects[subjectIndex].sessionIds.push(sessionId);
            }
            
            // Session verilerini subject'e sync et
            const subject = plan.subjects[subjectIndex];
            if (session.questionStats) {
                subject.correctAnswers += session.questionStats.correctAnswers || 0;
                subject.wrongAnswers += session.questionStats.wrongAnswers || 0;
                subject.blankAnswers += session.questionStats.blankAnswers || 0;
                subject.completedQuestions = subject.correctAnswers + subject.wrongAnswers + subject.blankAnswers;
            }
            subject.studyTime += session.duration || 0;
            
            // Status güncelle
            if (subject.completedQuestions >= subject.targetQuestions) {
                subject.status = 'completed';
            } else if (subject.completedQuestions > 0) {
                subject.status = 'in_progress';
            }
        }
        
        // Session'a plan referansı ekle
        session.dailyPlanId = id;
        await session.save();
        
        await plan.save();
        
        res.status(200).json({
            message: "Session başarıyla plan'a bağlandı",
            data: plan
        });
        
    } catch (error) {
        console.error('POST /daily-plans/link-session error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET - Aktif planlar (bugün ve gelecek)
router.get("/active", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({ message: 'User ID not found in token' });
        }
        
        const activePlans = await DailyPlan.getActiveByUser(userId);
        
        res.status(200).json({
            message: "Aktif planlar başarıyla getirildi",
            data: activePlans
        });
        
    } catch (error) {
        console.error('GET /daily-plans/active error:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Plan sil
router.delete("/:id", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        
        const plan = await DailyPlan.findOne({ _id: id, userId });
        if (!plan) {
            return res.status(404).json({ message: 'Plan bulunamadı veya erişim yetkiniz yok' });
        }
        
        await DailyPlan.findByIdAndDelete(id);
        
        res.status(200).json({ message: "Plan başarıyla silindi" });
        
    } catch (error) {
        console.error('DELETE /daily-plans error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST - Coach creates program for student
router.post("/coach-create", authenticateToken, checkRole('coach', 'admin'), async (req, res) => {
    try {
        const coachId = req.user?.userId;
        const { 
            studentId, 
            date, 
            subjects, 
            title, 
            coachNotes 
        } = req.body;
        
        // Validation
        if (!studentId || !date || !subjects || subjects.length === 0) {
            return res.status(400).json({ 
                message: 'Student ID, date, and subjects are required' 
            });
        }
        
        // Check if student exists and is actually a student
        const student = await Users.findById(studentId).select('role plan');
        if (!student || student.role !== 'student') {
            return res.status(400).json({ 
                message: 'Invalid student ID' 
            });
        }

        // Öğrencinin planı premium mu?
        const tier = student.plan?.tier || 'free';
        if (tier !== 'premium') {
            return res.status(403).json({ message: 'Öğrencinin planı ücretsiz. Koç programı oluşturulamaz.' });
        }
        
        // Create plan date
        const planDate = new Date(date);
        
        // Check if plan already exists for this student on this date
        const existingPlan = await DailyPlan.findByUserAndDate(studentId, planDate);
        if (existingPlan) {
            return res.status(400).json({ 
                message: 'Bu öğrenci için bu tarihte zaten bir plan mevcut' 
            });
        }
        
        // Transform subjects from coach format to DailyPlan format
        const transformedSubjects = subjects.map(subject => ({
            subject: subject.subject,
            description: subject.description,
            targetTime: subject.duration, // dakika cinsinden
            priority: 5, // default
            status: 'not_started',
            // Progress tracking defaults
            completedQuestions: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            blankAnswers: 0,
            studyTime: 0,
            sessionIds: []
        }));
        
        // Create plan
        const newPlan = new DailyPlan({
            userId: studentId,
            coachId: coachId,
            date: planDate,
            title: title || `Koç Programı - ${planDate.toLocaleDateString('tr-TR')}`,
            subjects: transformedSubjects,
            source: 'coach',
            status: 'active',
            coachNotes: coachNotes || '',
            coachApproval: true
        });
        
        await newPlan.save();
        
        // In-app notification: Coach program created for student
        try {
            const dateParam = planDate.toISOString().slice(0,10);
            await Notification.create({
                userId: studentId,
                category: 'coach',
                type: 'coach_program_created',
                title: 'Koçun programını hazırladı!',
                body: `${planDate.toLocaleDateString('tr-TR')} tarihli programınız yayınlandı. Hadi başlayalım!`,
                actionUrl: `/study-plan?date=${dateParam}`,
                importance: 'high',
                dedupeKey: `coach_program_created:${studentId}:${dateParam}`,
                meta: { dailyPlanId: String(newPlan._id), coachId: String(coachId), date: dateParam }
            });
        } catch (e) {
            console.error('Coach program notification error:', e);
        }

        res.status(201).json({
            message: "Program başarıyla oluşturuldu ve öğrenciye atandı",
            data: newPlan
        });
        
    } catch (error) {
        console.error('POST /daily-plans/coach-create error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST - Student feedback for daily plan
router.post("/:id/student-feedback", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { 
            subjectIndex, 
            correctAnswers, 
            wrongAnswers, 
            blankAnswers,
            feedbackText,
            motivationScore 
        } = req.body;
        
        // Validation
        if (subjectIndex === undefined || correctAnswers === undefined || wrongAnswers === undefined || blankAnswers === undefined) {
            return res.status(400).json({ 
                message: 'Subject index ve D-Y-B değerleri zorunludur' 
            });
        }
        
        const plan = await DailyPlan.findOne({ _id: id, userId });
        if (!plan) {
            return res.status(404).json({ message: 'Plan bulunamadı' });
        }
        
        if (!plan.subjects[subjectIndex]) {
            return res.status(404).json({ message: 'Ders bulunamadı' });
        }
        
        // Subject progress'i güncelle
        const subject = plan.subjects[subjectIndex];
        subject.correctAnswers = correctAnswers;
        subject.wrongAnswers = wrongAnswers;
        subject.blankAnswers = blankAnswers;
        subject.completedQuestions = correctAnswers + wrongAnswers + blankAnswers;
        subject.status = subject.completedQuestions > 0 ? 'completed' : 'not_started';
        
        // Günlük feedback'i plan'a ekle
        if (!plan.studentFeedback) {
            plan.studentFeedback = {
                feedbackText: '',
                motivationScore: 5,
                submittedAt: null
            };
        }
        
        plan.studentFeedback.feedbackText = feedbackText || '';
        plan.studentFeedback.motivationScore = motivationScore || 5;
        plan.studentFeedback.submittedAt = new Date();
        
        await plan.save();
        
        res.status(200).json({
            message: "Öğrenci feedback'i başarıyla kaydedildi",
            data: plan
        });
        
    } catch (error) {
        console.error('POST /daily-plans/student-feedback error:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT - Real-time tracking update
router.put("/:id/live-tracking", authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { subjectIndex, isActive, currentInterval, studyTime, questionsAnswered } = req.body;
        
        const plan = await DailyPlan.findOne({ _id: id, userId });
        if (!plan) {
            return res.status(404).json({ message: 'Plan bulunamadı' });
        }
        
        if (subjectIndex !== undefined && plan.subjects[subjectIndex]) {
            const subject = plan.subjects[subjectIndex];
            
            // Real-time güncellemeler
            if (studyTime !== undefined) {
                subject.studyTime = studyTime;
            }
            
            if (questionsAnswered !== undefined) {
                subject.completedQuestions = questionsAnswered.correct + questionsAnswered.wrong + questionsAnswered.blank;
                subject.correctAnswers = questionsAnswered.correct;
                subject.wrongAnswers = questionsAnswered.wrong;
                subject.blankAnswers = questionsAnswered.blank;
            }
            
            // Status güncellemesi
            if (isActive) {
                subject.status = 'in_progress';
            } else if (subject.completedQuestions >= subject.targetQuestions || subject.studyTime >= subject.targetTime) {
                subject.status = 'completed';
            }
        }
        
        await plan.save();
        
        res.status(200).json({
            message: "Canlı takip güncellendi",
            data: plan
        });
        
    } catch (error) {
        console.error('PUT /daily-plans/live-tracking error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET - Coach real-time dashboard
router.get("/coach/live-dashboard", authenticateToken, checkRole('coach', 'admin'), async (req, res) => {
    try {
        const coachId = req.user?.userId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Bugünkü aktif planları getir
        const todayPlans = await DailyPlan.find({
            coachId,
            date: { $gte: today, $lt: tomorrow },
            status: { $in: ['active', 'draft'] }
        }).populate('userId', 'firstName lastName email avatar');
        
        // Live tracking olan planları filtrele
        const liveStudents = [];
        const recentActivity = [];
        
        for (const plan of todayPlans) {
            const student = {
                studentId: plan.userId._id,
                studentName: `${plan.userId.firstName || ''} ${plan.userId.lastName || ''}`.trim() || plan.userId.email,
                avatar: plan.userId.avatar,
                planId: plan._id,
                planTitle: plan.title,
                totalSubjects: plan.subjects.length,
                completedSubjects: plan.subjects.filter(s => s.status === 'completed').length,
                inProgressSubjects: plan.subjects.filter(s => s.status === 'in_progress').length,
                totalProgress: plan.stats?.completionRate || 0,
                totalStudyTime: plan.stats?.totalStudyTime || 0,
                targetTime: plan.stats?.totalTargetTime || 0,
                lastActivity: plan.updatedAt
            };
            
            // Son 30 dakika içinde activity var mı?
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            if (plan.updatedAt > thirtyMinutesAgo) {
                liveStudents.push(student);
            }
            
            recentActivity.push(student);
        }
        
        res.json({
            message: "Koç canlı dashboard başarıyla getirildi",
            data: {
                liveStudents: liveStudents.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)),
                recentActivity: recentActivity.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)).slice(0, 20),
                summary: {
                    totalStudentsToday: todayPlans.length,
                    activeNow: liveStudents.length,
                    totalCompletedPlans: todayPlans.filter(p => p.stats?.completionRate === 100).length,
                    averageProgress: todayPlans.length > 0 ? Math.round(todayPlans.reduce((sum, p) => sum + (p.stats?.completionRate || 0), 0) / todayPlans.length) : 0
                }
            }
        });
        
    } catch (error) {
        console.error('GET /daily-plans/coach/live-dashboard error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET - Coach view student reports/feedback
router.get("/coach/student-reports", authenticateToken, checkRole('coach', 'admin'), async (req, res) => {
    try {
        const coachId = req.user?.userId;
        const { studentId, date, limit = 10, offset = 0 } = req.query;
        
        // Build query
        let query = { coachId, source: 'coach' };
        
        // Filter by student
        if (studentId) {
            query.userId = studentId;
        }
        
        // Filter by date
        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }
        
        // Get plans with student feedback
        const plans = await DailyPlan.find(query)
            .populate('userId', 'firstName lastName email')
            .sort({ date: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));
            
        // Filter only plans that have student feedback
        const plansWithFeedback = plans.filter(plan => 
            plan.studentFeedback && plan.studentFeedback.submittedAt
        );
        
        // Format response
        const formattedReports = plansWithFeedback.map(plan => ({
            _id: plan._id,
            date: plan.date,
            title: plan.title,
            student: {
                _id: plan.userId._id,
                name: `${plan.userId.firstName || ''} ${plan.userId.lastName || ''}`.trim() || plan.userId.email,
                email: plan.userId.email
            },
            subjects: plan.subjects.map(subject => ({
                subject: subject.subject,
                description: subject.description,
                targetTime: subject.targetTime,
                correctAnswers: subject.correctAnswers,
                wrongAnswers: subject.wrongAnswers,
                blankAnswers: subject.blankAnswers,
                completedQuestions: subject.completedQuestions,
                studyTime: subject.studyTime,
                status: subject.status,
                netScore: Math.max(subject.correctAnswers - (subject.wrongAnswers / 4), 0)
            })),
            studentFeedback: plan.studentFeedback,
            stats: {
                totalCompletedQuestions: plan.stats.totalCompletedQuestions,
                totalStudyTime: plan.stats.totalStudyTime,
                netScore: plan.stats.netScore,
                completionRate: plan.stats.completionRate
            },
            submittedAt: plan.studentFeedback.submittedAt
        }));
        
        res.json({
            message: "Öğrenci raporları başarıyla getirildi",
            data: formattedReports,
            total: plansWithFeedback.length
        });
        
    } catch (error) {
        console.error('GET /daily-plans/coach/student-reports error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;