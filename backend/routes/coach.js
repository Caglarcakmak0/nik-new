const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { checkRole } = require('../authRoles');
const Users = require('../models/Users');
const CoachStudent = require('../models/CoachStudent');
const DailyPlan = require('../models/DailyPlan');
const StudyProgram = require('../models/StudyProgram');

// Tüm endpointler koç veya admin ile erişilebilir
router.use(authenticateToken, checkRole('coach', 'admin'));

/**
 * @openapi
 * /coach/programs:
 *   post:
 *     tags:
 *       - Coach
 *     summary: Öğrenci için koç tarafından program oluştur (alias)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, date, subjects]
 *             properties:
 *               studentId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               title:
 *                 type: string
 *               coachNotes:
 *                 type: string
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     subject: { type: string }
 *                     description: { type: string }
 *                     duration: { type: number }
 *     responses:
 *       201:
 *         description: Oluşturuldu
 *       400:
 *         description: Doğrulama hatası
 */
// GET /api/coach/students
// Koç: kendi öğrencilerini döner. Admin: ?coachId= ile filtrelenebilir.
router.get('/students', async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 10, coachId } = req.query;
    const isAdmin = req.user.role === 'admin';
    const ownerCoachId = isAdmin && coachId ? coachId : req.user.userId;

    const relationQuery = {
      coachId: ownerCoachId,
      ...(status ? { status } : {})
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [relations, total] = await Promise.all([
      CoachStudent.find(relationQuery).sort({ assignedAt: -1 }).skip(skip).limit(parseInt(limit)),
      CoachStudent.countDocuments(relationQuery)
    ]);

    const studentIds = relations.map(r => r.studentId);
    if (studentIds.length === 0) {
      return res.json({ message: 'Öğrenci listesi', data: [], pagination: { page: Number(page), limit: Number(limit), total: 0 } });
    }

    const users = await Users.find({ _id: { $in: studentIds } })
      .select('firstName lastName email grade stats.lastActivity createdAt');

    // Bugünkü plan sayımı: bugün tarihli ve durumu 'active' veya 'draft' olan planlar
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const activeCounts = await Promise.all(
      users.map(u =>
        DailyPlan.countDocuments({
          userId: u._id,
          status: { $in: ['active', 'draft'] },
          date: { $gte: startOfDay, $lte: endOfDay }
        })
      )
    );

    const data = users.map((u, i) => ({
      _id: u._id,
      fullName: (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.firstName || u.lastName || u.email.split('@')[0]),
      email: u.email,
      grade: u.grade || '12. Sınıf',
      lastActivity: u.stats?.lastActivity || u.createdAt,
      activePlansCount: activeCounts[i] || 0,
      avatar: null
    }));

    return res.json({
      message: 'Öğrenci listesi',
      data,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    console.error('GET /coach/students error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/coach/students/:studentId
// Koç sadece kendi öğrencisinin detayını görebilir. Admin her öğrenciyi görebilir.
router.get('/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      const rel = await CoachStudent.findOne({
        coachId: req.user.userId,
        studentId,
        status: 'active'
      });
      if (!rel) {
        return res.status(404).json({ message: 'Bu öğrenci size atanmış değil' });
      }
    }

    const student = await Users.findById(studentId)
      .select('-password -refreshToken -refreshTokenVersion -refreshTokenExpiresAt');
    if (!student) return res.status(404).json({ message: 'Öğrenci bulunamadı' });

    // Programlar: Koç ise sadece kendi oluşturdukları; admin için tümü
    const programQuery = { studentId };
    if (!isAdmin) programQuery.coachId = req.user.userId;

    const programs = await StudyProgram.find(programQuery).sort({ startDate: -1 }).limit(50);

    // Basit özet istatistik (Users.stats’tan)
    const stats = {
      totalStudyTime: student.stats?.totalStudyTime || 0,
      totalStudySessions: student.stats?.totalStudySessions || 0,
      streak: student.stats?.currentStreak || 0,
      lastActivity: student.stats?.lastActivity || null
    };

    return res.json({
      message: 'Öğrenci detayı',
      data: {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          grade: student.grade,
          city: student.city
        },
        programs,
        stats
      }
    });
  } catch (error) {
    console.error('GET /coach/students/:studentId error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
 
// Aşağıdaki program yönetimi endpoint'leri koçun oluşturduğu günlük planları (DailyPlan, source: 'coach') yönetir

// GET /api/coach/programs
// Koç: kendi oluşturduğu programları listeler; admin opsiyonel coachId ile filtreleyebilir
router.get('/programs', async (req, res) => {
  try {
    const { studentId, date, page = 1, limit = 10, coachId } = req.query;
    const isAdmin = req.user.role === 'admin';
    const ownerCoachId = isAdmin && coachId ? coachId : req.user.userId;

    let query = { coachId: ownerCoachId, source: 'coach' };
    if (studentId) {
      query.userId = studentId;
    }
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [plans, total] = await Promise.all([
      DailyPlan.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DailyPlan.countDocuments(query)
    ]);

    const data = plans.map(p => ({
      _id: p._id,
      title: p.title,
      date: p.date,
      student: p.userId ? {
        _id: p.userId._id,
        name: `${p.userId.firstName || ''} ${p.userId.lastName || ''}`.trim() || p.userId.email,
        email: p.userId.email
      } : null,
      subjectsCount: (p.subjects || []).length,
      status: p.status
    }));

    return res.json({
      message: 'Program listesi',
      data,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    console.error('GET /coach/programs error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/coach/programs/:id
// Koç, kendi oluşturduğu (source: 'coach') programın detayını görüntüler
router.get('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    const plan = await DailyPlan.findById(id).populate('userId', 'firstName lastName email');
    if (!plan) return res.status(404).json({ message: 'Program bulunamadı' });

    if (!isAdmin) {
      if (!plan.coachId || plan.coachId.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Bu programı görüntüleme yetkiniz yok' });
      }
    }
    if (plan.source !== 'coach') {
      return res.status(400).json({ message: 'Bu program koç tarafından oluşturulmamış' });
    }

    return res.json({
      message: 'Program detayı',
      data: {
        _id: plan._id,
        title: plan.title,
        date: plan.date,

        status: plan.status,
        student: plan.userId ? {
          _id: plan.userId._id,
          name: `${plan.userId.firstName || ''} ${plan.userId.lastName || ''}`.trim() || plan.userId.email,
          email: plan.userId.email
        } : null,
        subjects: (plan.subjects || []).map(s => ({
          subject: s.subject,
          description: s.description || '',
          targetTime: s.targetTime || 0,
          priority: s.priority || 5,

        }))
      }
    });
  } catch (error) {
    console.error('GET /coach/programs/:id error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/coach/programs - koç için program oluşturma (alias yerine doğrudan uygulama)
router.post('/programs', async (req, res) => {
  try {
    const coachId = req.user?.userId;
    const { studentId, date, subjects, title } = req.body || {};

    // Validation
    if (!studentId || !date || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: 'Student ID, date, and subjects are required' });
    }

    // Check if student exists and is actually a student
    const student = await Users.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    // Create plan date
    const planDate = new Date(date);

    // Check if plan already exists for this student on this date
    const existingPlan = await DailyPlan.findByUserAndDate(studentId, planDate);
    if (existingPlan) {
      return res.status(400).json({ message: 'Bu öğrenci için bu tarihte zaten bir plan mevcut' });
    }

    // Transform subjects from coach format to DailyPlan format
    const transformedSubjects = subjects.map((subject) => ({
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

      coachApproval: true
    });

    await newPlan.save();

    return res.status(201).json({
      message: 'Program başarıyla oluşturuldu ve öğrenciye atandı',
      data: newPlan
    });
  } catch (error) {
    console.error('POST /coach/programs error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/coach/programs/:id
// Koç, kendi oluşturduğu (source: 'coach') programı günceller; ilerleme alanları korunur
router.put('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const { title, date, subjects } = req.body || {};

    const plan = await DailyPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: 'Program bulunamadı' });
    }

    if (!isAdmin) {
      if (!plan.coachId || plan.coachId.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Bu programı güncelleme yetkiniz yok' });
      }
    }

    if (plan.source !== 'coach') {
      return res.status(400).json({ message: 'Bu program koç tarafından oluşturulmamış' });
    }

    // Güncellenebilir alanlar
    if (typeof title === 'string') plan.title = title;

    if (date) {
      const newDate = new Date(date);
      if (!isNaN(newDate.getTime())) {
        plan.date = newDate;
      }
    }

    // Subjects alanı: yalnızca planlama alanlarını güncelle/ekle (ileri seviye: index eşleştirme)
    if (Array.isArray(subjects)) {
      if (!plan.subjects) {
        plan.subjects = [];
      }

      const existingLen = plan.subjects.length;
      const incomingLen = subjects.length;

      // Var olanları güncelle
      const len = Math.min(existingLen, incomingLen);
      for (let i = 0; i < len; i++) {
        const current = plan.subjects[i];
        const incoming = subjects[i] || {};
        if (typeof incoming.subject === 'string') current.subject = incoming.subject; // ders adı güncellenebilir (opsiyonel)
        if (typeof incoming.description === 'string' || incoming.description === null) current.description = incoming.description || '';
        if (typeof incoming.targetTime === 'number') current.targetTime = incoming.targetTime;
        if (typeof incoming.priority === 'number') current.priority = incoming.priority;

        // İlerleme alanlarına (correctAnswers, wrongAnswers, blankAnswers, studyTime, status, sessionIds) dokunma
      }

      // Yeni gelen fazla dersleri ekle
      if (incomingLen > existingLen) {
        for (let i = existingLen; i < incomingLen; i++) {
          const incoming = subjects[i] || {};
          plan.subjects.push({
            subject: typeof incoming.subject === 'string' ? incoming.subject : 'diger',
            description: typeof incoming.description === 'string' ? incoming.description : '',
            targetTime: typeof incoming.targetTime === 'number' ? incoming.targetTime : undefined,
            priority: typeof incoming.priority === 'number' ? incoming.priority : 5,

            // Progress defaults
            completedQuestions: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            blankAnswers: 0,
            studyTime: 0,
            status: 'not_started',
            sessionIds: []
          });
        }
      }
      // (Opsiyonel) Daha az konu gönderildiyse kalanları silmek istenirse burada trimlenebilir
      // Şimdilik öğrencinin ilerlemesi kaybolmasın diye kalanlar tutuluyor.
    }

    await plan.save();

    return res.json({ message: 'Program güncellendi', data: plan });
  } catch (error) {
    console.error('PUT /coach/programs/:id error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @openapi
 * /coach/programs/{id}:
 *   delete:
 *     tags:
 *       - Coach
 *     summary: Koç kendi oluşturduğu programı siler (admin override)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silindi
 *       403:
 *         description: Yetkiniz yok
 *       404:
 *         description: Bulunamadı
 */
router.delete('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const plan = await DailyPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Program bulunamadı' });
    if (plan.source !== 'coach') {
      return res.status(400).json({ message: 'Bu program koç tarafından oluşturulmamış' });
    }
    if (!isAdmin && String(plan.coachId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Bu programı silme yetkiniz yok' });
    }
    await DailyPlan.deleteOne({ _id: id });
    return res.json({ message: 'Program silindi' });
  } catch (error) {
    console.error('DELETE /coach/programs/:id error:', error);
    return res.status(500).json({ message: error.message });
  }
});
