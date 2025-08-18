const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { checkRole } = require('../authRoles');
const { blockCoachFromFeedback, validateOwnCoach } = require('../middlewares/feedback');
const CoachStudent = require('../models/CoachStudent');
const Users = require('../models/Users');
const CoachFeedback = require('../models/CoachFeedback');
const DailyPlan = require('../models/DailyPlan');
const PracticeExam = require('../models/PracticeExam');

// Tüm student endpoint'leri sadece öğrenci tarafından erişilebilir
router.use(authenticateToken, checkRole('student'));

/**
 * @openapi
 * /student/programs:
 *   get:
 *     tags:
 *       - Student
 *     summary: Öğrencinin günlük programlarını listele
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, completed, failed, archived]
 *         description: Plan durumu filtresi
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Başlangıç tarihi (ISO)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Bitiş tarihi (ISO)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Program listesi
 *       401:
 *         description: Yetkisiz
 */
// GET /api/student/my-coach - aktif koçu getir (MVP: tek aktif koç varsayıyoruz)
router.get('/my-coach', async (req, res) => {
  try {
    const studentId = req.user.userId;
    const relation = await CoachStudent.findOne({ studentId, status: 'active' }).sort({ assignedAt: -1 });

    if (!relation) {
      return res.json({ coach: null });
    }

    const coach = await Users.findById(relation.coachId).select('firstName lastName email avatar bio');
    if (!coach) {
      return res.json({ coach: null });
    }

    return res.json({
      coach: {
        id: coach._id,
        name: coach.firstName || coach.lastName ? `${coach.firstName || ''} ${coach.lastName || ''}`.trim() : (coach.email?.split('@')[0] || 'Koç'),
        email: coach.email,
        avatar: coach.avatar || null,
        bio: coach.bio || '',
        assignedAt: relation.assignedAt
      }
    });
  } catch (error) {
    console.error('GET /student/my-coach error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/student/feedback/coach/status - bu ay zorunlu durum
router.get('/feedback/coach/status', async (req, res) => {
  try {
    const studentId = req.user.userId;

    // Aktif koçu bul
    const relation = await CoachStudent.findOne({ studentId, status: 'active' }).sort({ assignedAt: -1 });
    if (!relation) {
      return res.json({
        dueThisMonth: false,
        coachId: null,
        lastSubmittedAt: null,
        countThisMonth: 0
      });
    }

    const coachId = relation.coachId;

    // Ay başlangıcı ve bitişi
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [lastOne, countThisMonth] = await Promise.all([
      CoachFeedback.findOne({ studentId, coachId }).sort({ createdAt: -1 }).select('createdAt'),
      CoachFeedback.countDocuments({
        studentId,
        coachId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      })
    ]);

    const dueThisMonth = countThisMonth === 0; // Ayda en az 1 zorunlu

    return res.json({
      dueThisMonth,
      coachId,
      lastSubmittedAt: lastOne?.createdAt || null,
      countThisMonth
    });
  } catch (error) {
    console.error('GET /student/feedback/coach/status error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/student/feedback/coach - koç değerlendirmesi gönder
router.post('/feedback/coach', blockCoachFromFeedback, validateOwnCoach, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { coachId, categories, feedback, specificIssues } = req.body || {};

    // Basit doğrulama
    if (!categories || !feedback || typeof feedback !== 'string' || feedback.trim().length < 5) {
      return res.status(400).json({ message: 'Geçerli kategori puanları ve yeterli uzunlukta geri bildirim metni gereklidir' });
    }

    const doc = await CoachFeedback.create({
      coachId,
      studentId,
      categories,
      feedback: feedback.trim(),
      specificIssues: specificIssues || {}
    });

    return res.status(201).json({ message: 'Değerlendirmeniz alındı', data: { id: doc._id } });
  } catch (error) {
    console.error('POST /student/feedback/coach error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/student/programs - öğrencinin programlarını listele (pagination opsiyonel)
router.get('/programs', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status, from, to } = req.query;
    const query = { userId };
    if (status) query.status = status;
    if (from || to) {
      const range = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      query.date = range;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      DailyPlan.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
      DailyPlan.countDocuments(query)
    ]);

    return res.json({
      message: 'Program listesi',
      data: items,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    console.error('GET /student/programs error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @openapi
 * /student/programs/{id}:
 *   get:
 *     tags:
 *       - Student
 *     summary: Belirli bir programın detayını getir
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
 *         description: Program detayı
 *       404:
 *         description: Program bulunamadı (kendi verisi değilse veya yoksa)
 */
router.get('/programs/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const plan = await DailyPlan.findOne({ _id: id, userId });
    if (!plan) return res.status(404).json({ message: 'Program bulunamadı' });
    return res.json({ message: 'Program detayı', data: plan });
  } catch (error) {
    console.error('GET /student/programs/:id error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// ==== STUDENT - PRACTICE EXAMS (DENEMELER) ====

// GET /api/student/exams?from=&to=&category=&page=&limit=
router.get('/exams', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to, category, page = 1, limit = 20 } = req.query;
    const query = { userId };
    if (category) query.category = category;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 20, 1);
    const skip = (pageNum - 1) * limitNum;
    const [items, total] = await Promise.all([
      PracticeExam.find(query).sort({ date: -1 }).skip(skip).limit(limitNum),
      PracticeExam.countDocuments(query)
    ]);
    return res.json({
      message: 'Deneme listesi',
      data: items,
      pagination: { page: pageNum, limit: limitNum, total }
    });
  } catch (error) {
    console.error('GET /student/exams error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/student/exams - deneme kaydı oluştur
// Body: { date, category, branchSubject?, title?, examDuration?, notes?, sections: [{ name, totalQuestions?, correctAnswers, wrongAnswers, blankAnswers, wrongTopics?: string[] }] }
router.post('/exams', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, category, branchSubject, title, examDuration, notes, sections } = req.body || {};

    if (!date || !category) {
      return res.status(400).json({ message: 'date ve category zorunludur' });
    }
    if (!['TYT_GENEL', 'AYT_GENEL', 'BRANS'].includes(String(category))) {
      return res.status(400).json({ message: 'Geçersiz category' });
    }
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ message: 'En az bir bölüm (section) gereklidir' });
    }

    const payload = {
      userId,
      date: new Date(date),
      category,
      branchSubject: category === 'BRANS' ? (branchSubject || '') : '',
      title: title?.trim(),
      examDuration,
      notes: notes?.trim(),
      sections: sections.map((s) => ({
        name: String(s.name || '').trim() || 'Bölüm',
        totalQuestions: Number(s.totalQuestions) || 0,
        correctAnswers: Number(s.correctAnswers) || 0,
        wrongAnswers: Number(s.wrongAnswers) || 0,
        blankAnswers: Number(s.blankAnswers) || 0,
        wrongTopics: Array.isArray(s.wrongTopics) ? s.wrongTopics.filter((t) => typeof t === 'string') : []
      }))
    };

    const doc = await PracticeExam.create(payload);
    return res.status(201).json({ message: 'Deneme kaydedildi', data: doc });
  } catch (error) {
    console.error('POST /student/exams error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/student/exams/:id - deneme kaydını güncelle
router.put('/exams/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const body = req.body || {};

    const doc = await PracticeExam.findOne({ _id: id, userId });
    if (!doc) return res.status(404).json({ message: 'Kayıt bulunamadı' });

    if (body.date) doc.date = new Date(body.date);
    if (body.category && ['TYT_GENEL', 'AYT_GENEL', 'BRANS'].includes(String(body.category))) {
      doc.category = body.category;
    }
    if (doc.category === 'BRANS') {
      if (typeof body.branchSubject === 'string') doc.branchSubject = body.branchSubject;
    } else {
      doc.branchSubject = '';
    }
    if (typeof body.title === 'string') doc.title = body.title.trim();
    if (typeof body.examDuration === 'number') doc.examDuration = body.examDuration;
    if (typeof body.notes === 'string') doc.notes = body.notes.trim();
    if (Array.isArray(body.sections)) {
      doc.sections = body.sections.map((s) => ({
        name: String(s.name || '').trim() || 'Bölüm',
        totalQuestions: Number(s.totalQuestions) || 0,
        correctAnswers: Number(s.correctAnswers) || 0,
        wrongAnswers: Number(s.wrongAnswers) || 0,
        blankAnswers: Number(s.blankAnswers) || 0,
        wrongTopics: Array.isArray(s.wrongTopics) ? s.wrongTopics.filter((t) => typeof t === 'string') : []
      }));
    }

    await doc.save();
    return res.json({ message: 'Deneme güncellendi', data: doc });
  } catch (error) {
    console.error('PUT /student/exams/:id error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// DELETE /api/student/exams/:id - deneme kaydını sil
router.delete('/exams/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const doc = await PracticeExam.findOneAndDelete({ _id: id, userId });
    if (!doc) return res.status(404).json({ message: 'Kayıt bulunamadı' });
    return res.json({ message: 'Deneme silindi' });
  } catch (error) {
    console.error('DELETE /student/exams/:id error:', error);
    return res.status(500).json({ message: error.message });
  }
});


module.exports = router;
