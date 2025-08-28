const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { checkRole } = require('../authRoles');
const Users = require('../models/Users');
const { requirePlan } = require('../middlewares/plan');
const CoachStudent = require('../models/CoachStudent');
const DailyPlan = require('../models/DailyPlan');
const StudyProgram = require('../models/StudyProgram');
const StudentSubjectPreference = require('../models/StudentSubjectPreference');

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
          videos: (s.videos || []).map(v => ({
            videoId: v.videoId,
            playlistId: v.playlistId,
            title: v.title,
            durationSeconds: v.durationSeconds,
            channelTitle: v.channelTitle,
            position: v.position,
            order: v.order,
            addedAt: v.addedAt
          }))
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
    const student = await Users.findById(studentId).select('role plan');
    if (!student || student.role !== 'student') {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    if ((student.plan?.tier || 'free') !== 'premium') {
      return res.status(403).json({ message: 'Öğrencinin planı ücretsiz. Koç programı oluşturulamaz.' });
    }

    // Create plan date
    const planDate = new Date(date);

    // Check if plan already exists for this student on this date
    const existingPlan = await DailyPlan.findByUserAndDate(studentId, planDate);
    if (existingPlan) {
      return res.status(400).json({ message: 'Bu öğrenci için bu tarihte zaten bir plan mevcut' });
    }

    // Transform subjects from coach format to DailyPlan format
    const transformedSubjects = subjects.map((subject, idx) => ({
      subject: subject.subject,
      description: subject.description,
      targetTime: subject.duration, // koç manuel override edebilir
      priority: 5,
      status: 'not_started',
      completedQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      blankAnswers: 0,
      studyTime: 0,
      sessionIds: [],
      videos: Array.isArray(subject.videos) ? subject.videos.map((v, vIdx) => ({
        videoId: v.videoId,
        playlistId: v.playlistId,
        title: v.title,
        durationSeconds: v.durationSeconds || 0,
        channelTitle: v.channelTitle,
        position: v.position,
        order: v.order != null ? v.order : vIdx,
        addedAt: new Date()
      })) : []
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
      // Bildirim ekle (eski sistemdeki gibi)
      const Notification = require('../models/Notification');
      const dateParam = planDate.toISOString().slice(0,10);
      try {
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
      } catch (notifErr) {
        console.error('Koç programı bildirimi eklenemedi:', notifErr);
      }

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

    // Öğrencinin planı premium mu?
    const student = await Users.findById(plan.userId).select('plan');
    if ((student?.plan?.tier || 'free') !== 'premium') {
      return res.status(403).json({ message: 'Öğrencinin planı ücretsiz. Koç programı güncellenemez.' });
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
        if (typeof incoming.targetTime === 'number') current.targetTime = incoming.targetTime; // manuel override
        if (typeof incoming.priority === 'number') current.priority = incoming.priority;

        // Videolar tam liste override modu
        if (Array.isArray(incoming.videos)) {
          current.videos = incoming.videos.map((v, vIdx) => ({
            videoId: v.videoId,
            playlistId: v.playlistId,
            title: v.title,
            durationSeconds: v.durationSeconds || 0,
            channelTitle: v.channelTitle,
            position: v.position,
            order: v.order != null ? v.order : vIdx,
            addedAt: v.addedAt ? new Date(v.addedAt) : new Date()
          }));
        }

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
            sessionIds: [],
            videos: Array.isArray(incoming.videos) ? incoming.videos.map((v, vIdx) => ({
              videoId: v.videoId,
              playlistId: v.playlistId,
              title: v.title,
              durationSeconds: v.durationSeconds || 0,
              channelTitle: v.channelTitle,
              position: v.position,
              order: v.order != null ? v.order : vIdx,
              addedAt: v.addedAt ? new Date(v.addedAt) : new Date()
            })) : []
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
    const student = await Users.findById(plan.userId).select('plan');
    if ((student?.plan?.tier || 'free') !== 'premium') {
      return res.status(403).json({ message: 'Öğrencinin planı ücretsiz. Koç programı silinemez.' });
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

// --- Subject Preferences (Coach) ---

// GET /api/coach/subject-preferences?studentId=&subject=
router.get('/subject-preferences', async (req, res) => {
  try {
    const { studentId, subject } = req.query;
    if (!studentId) return res.status(400).json({ message: 'studentId gerekli' });
    if (req.user.role !== 'admin') {
      const rel = await CoachStudent.findOne({ coachId: req.user.userId, studentId, status: 'active' });
      if (!rel) return res.status(403).json({ message: 'Bu öğrenci size atanmış değil' });
    }
    const q = { studentId, isActive: true };
    if (subject) q.subject = subject;
    const prefs = await StudentSubjectPreference.find(q).sort({ updatedAt: -1 });
    res.json({ message: 'Tercihler', data: prefs });
  } catch (e) {
    console.error('GET /coach/subject-preferences error', e);
    res.status(500).json({ message: e.message });
  }
});

// POST /api/coach/subject-preferences
router.post('/subject-preferences', async (req, res) => {
  try {
    const coachId = req.user.userId;
    const { studentId, subject, teacherName, playlistId, playlistTitle, channelId, channelTitle } = req.body || {};
    if (!studentId || !subject || !playlistId) {
      return res.status(400).json({ message: 'studentId, subject, playlistId zorunlu' });
    }
    if (req.user.role !== 'admin') {
      const rel = await CoachStudent.findOne({ coachId, studentId, status: 'active' });
      if (!rel) return res.status(403).json({ message: 'Bu öğrenci size atanmış değil' });
    }
    await StudentSubjectPreference.updateMany({ studentId, subject, isActive: true }, { $set: { isActive: false } });
    const pref = await StudentSubjectPreference.create({ studentId, coachId, subject, teacherName, playlistId, playlistTitle, channelId, channelTitle });
    res.status(201).json({ message: 'Tercih oluşturuldu', data: pref });
  } catch (e) {
    console.error('POST /coach/subject-preferences error', e);
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/coach/subject-preferences/:id
router.put('/subject-preferences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherName, notes } = req.body || {};
    const pref = await StudentSubjectPreference.findById(id);
    if (!pref) return res.status(404).json({ message: 'Kayıt bulunamadı' });
    if (req.user.role !== 'admin' && String(pref.coachId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    if (typeof teacherName === 'string') pref.teacherName = teacherName;
    if (typeof notes === 'string') pref.notes = notes;
    await pref.save();
    res.json({ message: 'Güncellendi', data: pref });
  } catch (e) {
    console.error('PUT /coach/subject-preferences/:id error', e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/coach/used-videos?studentId=&subject=&days=120
router.get('/used-videos', async (req, res) => {
  try {
    const { studentId, subject, days = 120 } = req.query;
    if (!studentId || !subject) return res.status(400).json({ message: 'studentId ve subject gerekli' });
    if (req.user.role !== 'admin') {
      const rel = await CoachStudent.findOne({ coachId: req.user.userId, studentId, status: 'active' });
      if (!rel) return res.status(403).json({ message: 'Bu öğrenci size atanmış değil' });
    }
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const plans = await DailyPlan.find({ userId: studentId, date: { $gte: since } }, { subjects: 1 });
    const set = new Set();
    plans.forEach(p => {
      (p.subjects || []).forEach(s => {
        if (s.subject === subject && Array.isArray(s.videos)) {
          s.videos.forEach(v => set.add(v.videoId));
        }
      });
    });
    res.json({ message: 'Kullanılmış videolar', data: Array.from(set) });
  } catch (e) {
    console.error('GET /coach/used-videos error', e);
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/coach/programs/:id/subjects/:subjectIndex/videos
router.patch('/programs/:id/subjects/:subjectIndex/videos', async (req, res) => {
  try {
    const { id, subjectIndex } = req.params;
    const { add = [], remove = [], reorder = [] } = req.body || {};
    const plan = await DailyPlan.findById(id);
    if (!plan) return res.status(404).json({ message: 'Plan bulunamadı' });
    if (plan.source !== 'coach') return res.status(400).json({ message: 'Koç planı değil' });
    if (req.user.role !== 'admin' && String(plan.coachId) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    const idx = parseInt(subjectIndex, 10);
    if (isNaN(idx) || !plan.subjects[idx]) return res.status(400).json({ message: 'Geçersiz subjectIndex' });
    const subject = plan.subjects[idx];
    if (!Array.isArray(subject.videos)) subject.videos = [];

    if (Array.isArray(remove) && remove.length) {
      subject.videos = subject.videos.filter(v => !remove.includes(v.videoId));
    }
    if (Array.isArray(add) && add.length) {
      const existingIds = new Set(subject.videos.map(v => v.videoId));
      add.forEach((v, vIdx) => {
        if (!existingIds.has(v.videoId)) {
          subject.videos.push({
            videoId: v.videoId,
            playlistId: v.playlistId,
            title: v.title,
            durationSeconds: v.durationSeconds || 0,
            channelTitle: v.channelTitle,
            position: v.position,
            order: v.order != null ? v.order : subject.videos.length + vIdx,
            addedAt: new Date()
          });
        }
      });
    }
    if (Array.isArray(reorder) && reorder.length) {
      const orderMap = new Map(reorder.map(r => [r.videoId, r.order]));
      subject.videos.forEach(v => {
        if (orderMap.has(v.videoId)) v.order = orderMap.get(v.videoId);
      });
      subject.videos.sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || new Date(a.addedAt) - new Date(b.addedAt));
    }

    await plan.save();
    res.json({ message: 'Videolar güncellendi', data: plan.subjects[idx].videos });
  } catch (e) {
    console.error('PATCH /coach/programs/:id/subjects/:subjectIndex/videos error', e);
    res.status(500).json({ message: e.message });
  }
});
