const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { checkRole } = require('../authRoles');
const CoachStudent = require('../models/CoachStudent');
const Users = require('../models/Users');
const CoachFeedback = require('../models/CoachFeedback');
const CoachPerformance = require('../models/CoachPerformance');
const DailyPlan = require('../models/DailyPlan');
const Motivation = require('../models/Motivation');

// Plan/limit varsayılanları
function getDefaultLimitsForTier(tier) {
  if (tier === 'premium') {
    return {
      activePlansMax: 50,
      studySessionsPerDay: 100,
      examsPerMonth: 100
    };
  }
  // free
  return {
    activePlansMax: 1,
    studySessionsPerDay: 5,
    examsPerMonth: 2
  };
}

// Basit bakım durumu (in-memory). Prod için kalıcı depolama (DB) önerilir.
let maintenanceState = {
  maintenanceMode: false,
  lastOptimizationAt: null,
  lastOptimizationResult: null,
  lastSecurityScanAt: null,
  lastSecurityScanResult: null,
};

// Basit in-memory cache (24 saat TTL)
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const simpleCache = {
  coachesStats: { data: null, expiresAt: 0 },
  feedbackSummary: { data: null, expiresAt: 0 },
};
const setAdminCacheHeaders = (res) => {
  // Admin endpoint'leri için private cache
  res.set('Cache-Control', 'private, max-age=86400');
};

router.use(authenticateToken, checkRole('admin'));

/**
 * GET /api/admin/users
 * Admin kullanıcı listesi (arama, role filtresi, sayfalama)
 * Query:
 *  - q: string (ad/soyad/e-posta)
 *  - role: 'admin' | 'coach' | 'student'
 *  - page: number (1-based)
 *  - limit: number
 */
router.get('/users', async (req, res) => {
  try {
    const { q = '', role = '', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (role && ['admin', 'coach', 'student'].includes(String(role))) {
      query.role = role;
    }
    if (q) {
      query.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Users.find(query)
        .select('firstName lastName email role createdAt profileCompleteness isActive stats.lastActivity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Users.countDocuments(query),
    ]);

    const data = items.map((u) => ({
      _id: u._id,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email,
      role: u.role,
      profileCompleteness: typeof u.profileCompleteness === 'number' ? u.profileCompleteness : 0,
      lastActivity: (u.stats && u.stats.lastActivity) ? u.stats.lastActivity : (u.lastLoginAt || u.createdAt),
      status: u.isActive ? 'active' : 'inactive',
      registrationDate: u.createdAt,
    }));

    return res.json({
      message: 'Kullanıcı listesi',
      data,
      pagination: { page: pageNum, limit: limitNum, total },
    });
  } catch (error) {
    console.error('GET /admin/users error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// ========= Plan Yönetimi =========
// GET /api/admin/users/:id/plan
router.get('/users/:id/plan', async (req, res) => {
  try {
    const user = await Users.findById(req.params.id).select('plan entitlements limits email firstName lastName');
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    return res.json({ message: 'Plan bilgisi', data: user });
  } catch (error) {
    console.error('GET /admin/users/:id/plan error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/users/:id/plan { tier, status?, expiresAt? , resetLimits?: boolean }
router.put('/users/:id/plan', async (req, res) => {
  try {
    const { tier, status, expiresAt, resetLimits } = req.body || {};
    if (tier && !['free', 'premium'].includes(String(tier))) {
      return res.status(400).json({ message: 'Geçersiz tier' });
    }

    const user = await Users.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    // Plan güncelle
    if (!user.plan) user.plan = { tier: 'free', status: 'active', startedAt: new Date(), expiresAt: null };
    if (tier) user.plan.tier = tier;
    if (status) user.plan.status = status;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (!isNaN(d.getTime())) user.plan.expiresAt = d;
    }

    // Limitleri varsayılana reset
    if (resetLimits || tier) {
      user.limits = getDefaultLimitsForTier(user.plan.tier);
    }

    // Plan değişimi: tokenVersion artır → mevcut tokenlar düşsün
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const safe = user.toObject();
    delete safe.password;
    delete safe.refreshToken;
    delete safe.refreshTokenVersion;
    delete safe.refreshTokenExpiresAt;
    return res.json({ message: 'Plan güncellendi', data: safe });
  } catch (error) {
    console.error('PUT /admin/users/:id/plan error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/users/:id/limits { activePlansMax?, studySessionsPerDay?, examsPerMonth? }
router.put('/users/:id/limits', async (req, res) => {
  try {
    const updates = req.body || {};
    const user = await Users.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    user.limits = { ...(user.limits || {}), ...updates };
    await user.save();
    return res.json({ message: 'Limitler güncellendi', data: user.limits });
  } catch (error) {
    console.error('PUT /admin/users/:id/limits error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/users/:id/entitlements { entitlements: string[] }
router.put('/users/:id/entitlements', async (req, res) => {
  try {
    const ents = Array.isArray(req.body?.entitlements) ? req.body.entitlements : null;
    if (!ents) return res.status(400).json({ message: 'entitlements array gereklidir' });
    const user = await Users.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    user.entitlements = ents;
    await user.save();
    return res.json({ message: 'Entitlements güncellendi', data: user.entitlements });
  } catch (error) {
    console.error('PUT /admin/users/:id/entitlements error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * ADMIN MAINTENANCE ENDPOINTS
 * İhtiyaçlar: DB optimizasyonu, güvenlik taraması, bakım modu toggle, durum sorgu
 */

// GET /api/admin/maintenance/status
router.get('/maintenance/status', async (req, res) => {
  try {
    return res.json({
      message: 'Bakım durumu',
      data: {
        maintenanceMode: maintenanceState.maintenanceMode,
        lastOptimizationAt: maintenanceState.lastOptimizationAt,
        lastSecurityScanAt: maintenanceState.lastSecurityScanAt,
        lastOptimizationResult: maintenanceState.lastOptimizationResult,
        lastSecurityScanResult: maintenanceState.lastSecurityScanResult,
      }
    });
  } catch (error) {
    console.error('GET /admin/maintenance/status error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/maintenance/mode { enabled: boolean }
router.post('/maintenance/mode', async (req, res) => {
  try {
    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'enabled parametresi boolean olmalıdır' });
    }
    maintenanceState.maintenanceMode = enabled;
    return res.json({ message: `Bakım modu ${enabled ? 'aktif' : 'pasif'}`, data: { maintenanceMode: enabled } });
  } catch (error) {
    console.error('POST /admin/maintenance/mode error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/maintenance/optimize-db
router.post('/maintenance/optimize-db', async (req, res) => {
  try {
    // Not: MongoDB'de gerçek compact işlemleri admin yetkisi gerektirir. Burada güvenli, hafif bir bakım yapılır.
    // Index senkronizasyonu ve temel istatistiklerle simülasyon.
    const models = [Users, CoachStudent, CoachFeedback, CoachPerformance];
    let reIndexed = 0;
    let collections = [];
    for (const m of models) {
      try {
        await m.syncIndexes();
        reIndexed++;
        collections.push(m.collection.collectionName);
      } catch (_) {
        // no-op
      }
    }
    // Basit istatistikler
    const [usersCount, relationsCount, feedbackCount] = await Promise.all([
      Users.countDocuments({}),
      CoachStudent.countDocuments({}),
      CoachFeedback.countDocuments({}),
    ]);

    const result = {
      reIndexedCollections: reIndexed,
      collections,
      stats: { usersCount, relationsCount, feedbackCount },
    };
    maintenanceState.lastOptimizationAt = new Date();
    maintenanceState.lastOptimizationResult = result;
    return res.json({ message: 'Veritabanı bakımı tamamlandı', data: result });
  } catch (error) {
    console.error('POST /admin/maintenance/optimize-db error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/maintenance/security-scan
router.post('/maintenance/security-scan', async (req, res) => {
  try {
    // Basit güvenlik taraması: eksik e-posta, zayıf profil tamamlanma, pasif ama son login yakın vb.
    const weakProfiles = await Users.find({ $or: [ { email: { $exists: false } }, { email: '' } ] }).select('_id');
    const lowCompletion = await Users.find({ profileCompleteness: { $lt: 20 } }).select('_id');
    const inactiveUsers = await Users.find({ isActive: false }).select('_id');

    const result = {
      weakProfiles: weakProfiles.map(u => u._id),
      lowCompletionUsers: lowCompletion.map(u => u._id),
      inactiveUsers: inactiveUsers.map(u => u._id),
      recommendations: [
        'Zayıf profiller için onboarding e-postası gönderin',
        'Düşük profil tamamlanmasına sahip kullanıcılar için rehber turu tetikleyin',
        'Uzun süre pasif kullanıcıları arşivlemeyi değerlendirin'
      ]
    };

    maintenanceState.lastSecurityScanAt = new Date();
    maintenanceState.lastSecurityScanResult = { counts: {
      weakProfiles: result.weakProfiles.length,
      lowCompletionUsers: result.lowCompletionUsers.length,
      inactiveUsers: result.inactiveUsers.length,
    } };

    return res.json({ message: 'Güvenlik taraması tamamlandı', data: result });
  } catch (error) {
    console.error('POST /admin/maintenance/security-scan error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * ADMIN - Weekly Motivation Quote
 * GET /api/admin/motivation?year=YYYY&week=WW
 * PUT /api/admin/motivation { text, author?, year?, week? }
 */
router.get('/motivation', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getUTCFullYear();
    const weekOfYear = parseInt(req.query.week) || (() => {
      const d = new Date();
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
    })();
    const doc = await Motivation.findOne({ year, weekOfYear });
    return res.json({ message: 'Motivasyon', data: doc });
  } catch (error) {
    console.error('GET /admin/motivation error:', error);
    return res.status(500).json({ message: error.message });
  }
});

router.put('/motivation', async (req, res) => {
  try {
    const { text, author, year, week } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'text gerekli' });
    }
    const d = new Date();
    const yr = parseInt(year) || d.getUTCFullYear();
    const wk = parseInt(week) || (() => {
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
    })();

    const payload = {
      text: text.trim(),
      author: author?.trim() || undefined,
      year: yr,
      weekOfYear: wk,
      isActive: true,
      updatedBy: req.user?.userId
    };

    const doc = await Motivation.findOneAndUpdate(
      { year: yr, weekOfYear: wk },
      { $set: payload },
      { upsert: true, new: true }
    );

    return res.json({ message: 'Motivasyon güncellendi', data: doc });
  } catch (error) {
    console.error('PUT /admin/motivation error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @openapi
 * /admin/coaches:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Koçları listele (filtre/pagination)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: İsim veya e-posta araması
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Liste
 */
router.get('/coaches', async (req, res) => {
  try {
    const { q = '', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { role: 'coach' };
    if (q) {
      query.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }
    const [items, total] = await Promise.all([
      Users.find(query)
        .select('firstName lastName email city grade createdAt avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Users.countDocuments(query)
    ]);
    const data = items.map(u => ({
      _id: u._id,
      name: (u.firstName || u.lastName) ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.email?.split('@')[0] || 'Koç'),
      email: u.email,
      city: u.city || '',
      avatar: u.avatar || null,
      createdAt: u.createdAt
    }));
    return res.json({ message: 'Koç listesi', data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (error) {
    console.error('GET /admin/coaches error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @openapi
 * /admin/coaches/{id}/students:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Belirli koçun öğrencilerini listele (filtre/pagination)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Liste
 */
router.get('/coaches/:id/students', async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'active', page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const relationQuery = { coachId: id };
    if (status) relationQuery.status = status;

    const [relations, total] = await Promise.all([
      CoachStudent.find(relationQuery).sort({ assignedAt: -1 }).skip(skip).limit(parseInt(limit)),
      CoachStudent.countDocuments(relationQuery)
    ]);

    const studentIds = relations.map(r => r.studentId);
    const students = studentIds.length
      ? await Users.find({ _id: { $in: studentIds } }).select('firstName lastName email grade city createdAt')
      : [];

    const data = students.map(s => ({
      _id: s._id,
      name: (s.firstName || s.lastName) ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : (s.email?.split('@')[0] || 'Öğrenci'),
      email: s.email,
      grade: s.grade || '12',
      city: s.city || ''
    }));

    return res.json({ message: 'Öğrenci listesi', data, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (error) {
    console.error('GET /admin/coaches/:id/students error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @openapi
 * /admin/coaches/{id}/performance:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Koç performans özeti
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Performans özeti
 */
router.get('/coaches/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const perf = await (require('../models/CoachPerformance')).findOne({ coachId: id });
    // Hassas alanları maskele: kullanıcı bilgileri yok; yalnızca özet
    const summary = perf ? {
      coachId: perf.coachId,
      studentStats: perf.studentStats,
      feedbackStats: {
        totalFeedbacks: perf.feedbackStats?.totalFeedbacks || 0,
        averageRating: perf.feedbackStats?.averageRating || 0,
        categoryAverages: perf.feedbackStats?.categoryAverages || {},
        issuesCounts: perf.feedbackStats?.issuesCounts || {},
        lastFeedbackDate: perf.feedbackStats?.lastFeedbackDate || null
      },
      lastUpdated: perf.lastUpdated
    } : {
      coachId: id,
      studentStats: { total: 0, active: 0, inactive: 0 },
      feedbackStats: { totalFeedbacks: 0, averageRating: 0, categoryAverages: {}, issuesCounts: {} },
      lastUpdated: null
    };

    return res.json({ message: 'Koç performans özeti', data: summary });
  } catch (error) {
    console.error('GET /admin/coaches/:id/performance error:', error);
    return res.status(500).json({ message: error.message });
  }
});
// POST /api/admin/assign-coach
// Body: { coachId, studentIds: [...] }
router.post('/assign-coach', async (req, res) => {
  try {
    const { coachId, studentIds } = req.body;
    if (!coachId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'coachId ve studentIds gereklidir' });
    }

    // Coach var mı?
    const coach = await Users.findById(coachId);
    if (!coach || coach.role !== 'coach') {
      return res.status(400).json({ message: 'Geçersiz coachId' });
    }

    let created = 0, skipped = 0;
    for (const studentId of studentIds) {
      // Öğrenci var mı?
      const student = await Users.findById(studentId);
      if (!student || student.role !== 'student') {
        skipped++;
        continue;
      }

      // Aynı koç-öğrenci için zaten aktif ilişki varsa geç
      const exists = await CoachStudent.findOne({ coachId, studentId, status: 'active' });
      if (exists) { skipped++; continue; }

      await CoachStudent.create({
        coachId,
        studentId,
        assignedBy: req.user.userId,
        status: 'active'
      });
      created++;
    }

    return res.json({ message: 'Atama tamamlandı', result: { created, skipped } });
  } catch (error) {
    console.error('POST /admin/assign-coach error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/admin/students/:id/programs
 * Belirli bir öğrencinin günlük planlarını (DailyPlan) tarih aralığı ve/veya durum ve/veya source filtresi ile döner
 * Query:
 *  - from: ISO tarih (opsiyonel)
 *  - to: ISO tarih (opsiyonel)
 *  - status: draft|active|completed|failed|archived (opsiyonel)
 *  - source: self|coach|template|ai_generated (opsiyonel)
 */
router.get('/students/:id/programs', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, status, source, page, limit } = req.query;

    const query = { userId: id };
    if (status) query.status = status;
    if (source) query.source = source;
    if (from || to) {
      const range = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      query.date = range;
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 200, 1);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      DailyPlan.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      DailyPlan.countDocuments(query)
    ]);

    return res.json({
      message: 'Öğrenci planları',
      data: items,
      pagination: { page: pageNum, limit: limitNum, total }
    });
  } catch (error) {
    console.error('GET /admin/students/:id/programs error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/reassign-student
// Body: { studentId, fromCoachId, toCoachId, reason }
router.put('/reassign-student', async (req, res) => {
  try {
    const { studentId, fromCoachId, toCoachId } = req.body;
    if (!studentId || !fromCoachId || !toCoachId) {
      return res.status(400).json({ message: 'studentId, fromCoachId ve toCoachId gereklidir' });
    }
    if (fromCoachId === toCoachId) {
      return res.status(400).json({ message: 'Aynı koça yeniden atama yapılamaz' });
    }

    // Mevcut aktif ilişkiyi pasifleştir
    const current = await CoachStudent.findOne({ coachId: fromCoachId, studentId, status: 'active' });
    if (!current) {
      return res.status(404).json({ message: 'Aktif ilişki bulunamadı' });
    }
    current.status = 'inactive';
    await current.save();

    // Yeni koça aktif atama oluştur (unique partial index korur)
    await CoachStudent.create({
      coachId: toCoachId,
      studentId,
      assignedBy: req.user.userId,
      status: 'active'
    });

    return res.json({ message: 'Yeniden atama tamamlandı' });
  } catch (error) {
    console.error('PUT /admin/reassign-student error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
/**
 * Feedback Yönetimi - Koç Değerlendirmeleri (Sadece Admin)
 */
// GET /api/admin/feedbacks?status=new|read&limit=20&offset=0
router.get('/feedbacks', async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const query = {};
    if (status === 'new' || status === 'read') {
      query.status = status;
    }

    const [items, total] = await Promise.all([
      CoachFeedback.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .populate('studentId', 'firstName lastName email')
        .populate('coachId', 'firstName lastName email')
        .select('-__v'),
      CoachFeedback.countDocuments(query)
    ]);

    const data = items.map((f) => ({
      id: f._id,
      coach: {
        id: f.coachId?._id,
        name: f.coachId?.firstName || f.coachId?.lastName
          ? `${f.coachId?.firstName || ''} ${f.coachId?.lastName || ''}`.trim()
          : (f.coachId?.email?.split('@')[0] || 'Koç')
      },
      student: {
        id: f.studentId?._id,
        name: f.studentId?.firstName || f.studentId?.lastName
          ? `${f.studentId?.firstName || ''} ${f.studentId?.lastName || ''}`.trim()
          : (f.studentId?.email?.split('@')[0] || 'Öğrenci')
      },
      overallRating: f.overallRating,
      status: f.status,
      createdAt: f.createdAt
    }));

    return res.json({
      message: 'Feedback listesi',
      data,
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    });
  } catch (error) {
    console.error('GET /admin/feedbacks error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/feedbacks/:id - detay
router.get('/feedbacks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const f = await CoachFeedback.findById(id)
      .populate('studentId', 'firstName lastName email')
      .populate('coachId', 'firstName lastName email')
      .select('-__v');
    if (!f) return res.status(404).json({ message: 'Feedback bulunamadı' });

    return res.json({
      id: f._id,
      coach: {
        id: f.coachId?._id,
        name: f.coachId?.firstName || f.coachId?.lastName
          ? `${f.coachId?.firstName || ''} ${f.coachId?.lastName || ''}`.trim()
          : (f.coachId?.email?.split('@')[0] || 'Koç')
      },
      student: {
        id: f.studentId?._id,
        name: f.studentId?.firstName || f.studentId?.lastName
          ? `${f.studentId?.firstName || ''} ${f.studentId?.lastName || ''}`.trim()
          : (f.studentId?.email?.split('@')[0] || 'Öğrenci')
      },
      categories: f.categories,
      specificIssues: f.specificIssues,
      feedback: f.feedback,
      overallRating: f.overallRating,
      status: f.status,
      createdAt: f.createdAt,
      readAt: f.readAt,
      readBy: f.readBy
    });
  } catch (error) {
    console.error('GET /admin/feedbacks/:id error:', error);
    return res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/feedbacks/:id/read - okundu işaretle
router.put('/feedbacks/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const f = await CoachFeedback.findById(id);
    if (!f) return res.status(404).json({ message: 'Feedback bulunamadı' });

    f.status = 'read';
    f.readBy = req.user.userId;
    f.readAt = new Date();
    await f.save();

    return res.json({ message: 'Feedback okundu olarak işaretlendi' });
  } catch (error) {
    console.error('PUT /admin/feedbacks/:id/read error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/admin/statistics/coaches
 * CoachPerformance özetlerini döner (studentStats, feedbackStats, lastFeedbackDate).
 */
router.get('/statistics/coaches', async (req, res) => {
  try {
    const now = Date.now();
    if (simpleCache.coachesStats.data && simpleCache.coachesStats.expiresAt > now) {
      setAdminCacheHeaders(res);
      return res.json({ message: 'Koç istatistikleri (cache)', data: simpleCache.coachesStats.data });
    }

    const items = await CoachPerformance.find({})
      .populate('coachId', 'firstName lastName email')
      .lean();

    const data = items.map((p) => ({
      coach: {
        id: p.coachId?._id,
        name:
          (p.coachId?.firstName || p.coachId?.lastName)
            ? `${p.coachId?.firstName || ''} ${p.coachId?.lastName || ''}`.trim()
            : (p.coachId?.email?.split('@')[0] || 'Koç'),
        email: p.coachId?.email || null,
      },
      studentStats: p.studentStats || { total: 0, active: 0, inactive: 0 },
      feedbackStats: p.feedbackStats || {
        totalFeedbacks: 0,
        averageRating: 0,
        categoryAverages: { communication: 0, programQuality: 0, overallSatisfaction: 0 },
        issuesCounts: { tooMuchPressure: 0, notEnoughSupport: 0, communicationProblems: 0, programNotSuitable: 0 },
        lastFeedbackDate: null,
      },
      lastUpdated: p.lastUpdated || p.updatedAt || p.createdAt,
    }));

    // Cache'e yaz
    simpleCache.coachesStats = { data, expiresAt: now + ONE_DAY_MS };
    setAdminCacheHeaders(res);
    return res.json({ message: 'Koç istatistikleri', data });
  } catch (error) {
    console.error('GET /admin/statistics/coaches error:', error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/admin/statistics/feedback-summary
 * Sistemdeki tüm koç feedback'lerinin özetini döner (ortalama, issue sayıları, son feedback tarihi).
 */
router.get('/statistics/feedback-summary', async (req, res) => {
  try {
    const now = Date.now();
    if (simpleCache.feedbackSummary.data && simpleCache.feedbackSummary.expiresAt > now) {
      setAdminCacheHeaders(res);
      return res.json({ message: 'Feedback özeti (cache)', data: simpleCache.feedbackSummary.data });
    }

    const [summary] = await CoachFeedback.aggregate([
      {
        $group: {
          _id: null,
          totalFeedbacks: { $sum: 1 },
          averageRating: { $avg: '$overallRating' },
          avgCommunication: { $avg: '$categories.communication' },
          avgProgramQuality: { $avg: '$categories.programQuality' },
          avgOverallSatisfaction: { $avg: '$categories.overallSatisfaction' },
          tooMuchPressure: { $sum: { $cond: [{ $eq: ['$specificIssues.tooMuchPressure', true] }, 1, 0] } },
          notEnoughSupport: { $sum: { $cond: [{ $eq: ['$specificIssues.notEnoughSupport', true] }, 1, 0] } },
          communicationProblems: { $sum: { $cond: [{ $eq: ['$specificIssues.communicationProblems', true] }, 1, 0] } },
          programNotSuitable: { $sum: { $cond: [{ $eq: ['$specificIssues.programNotSuitable', true] }, 1, 0] } },
          lastFeedbackDate: { $max: '$createdAt' },
          newCount: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          readCount: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        },
      },
    ]);

    const data = summary
      ? {
          totalFeedbacks: summary.totalFeedbacks || 0,
          averageRating: round(summary.averageRating || 0, 1),
          categoryAverages: {
            communication: round(summary.avgCommunication || 0, 2),
            programQuality: round(summary.avgProgramQuality || 0, 2),
            overallSatisfaction: round(summary.avgOverallSatisfaction || 0, 2),
          },
          issuesCounts: {
            tooMuchPressure: summary.tooMuchPressure || 0,
            notEnoughSupport: summary.notEnoughSupport || 0,
            communicationProblems: summary.communicationProblems || 0,
            programNotSuitable: summary.programNotSuitable || 0,
          },
          lastFeedbackDate: summary.lastFeedbackDate || null,
          statusCounts: { new: summary.newCount || 0, read: summary.readCount || 0 },
        }
      : {
          totalFeedbacks: 0,
          averageRating: 0,
          categoryAverages: { communication: 0, programQuality: 0, overallSatisfaction: 0 },
          issuesCounts: { tooMuchPressure: 0, notEnoughSupport: 0, communicationProblems: 0, programNotSuitable: 0 },
          lastFeedbackDate: null,
          statusCounts: { new: 0, read: 0 },
        };

    simpleCache.feedbackSummary = { data, expiresAt: now + ONE_DAY_MS };
    setAdminCacheHeaders(res);
    return res.json({ message: 'Feedback özeti', data });
  } catch (error) {
    console.error('GET /admin/statistics/feedback-summary error:', error);
    return res.status(500).json({ message: error.message });
  }
});

function round(value, digits) {
  const m = Math.pow(10, digits || 0);
  return Math.round((value + Number.EPSILON) * m) / m;
}