const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth.js');
const { checkRole } = require('../authRoles.js');
const Duel = require('../models/Duel.js');
const StudySession = require('../models/StudySession.js');

const getPeriodRange = (period) => {
    const now = new Date();
    if (period === 'daily') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(start.getDate() + 1);
        return { start, end };
    }
    // weekly (ISO week Mon-Sun)
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day; // Monday as start
    const start = new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(start.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
};

// Helper: compute total study minutes for a user within range
const computeUserStudyMinutes = async (userId, start, end) => {
    const result = await StudySession.aggregate([
        { $match: { userId, date: { $gte: start, $lt: end } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);
    return (result[0]?.total) || 0;
};

// POST /duels/invite - Düello daveti oluştur
router.post('/invite', authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const challengerId = req.user?.userId;
        const { opponentId, period } = req.body;
        if (!opponentId || !['daily','weekly'].includes(period)) {
            return res.status(400).json({ message: 'opponentId ve period (daily|weekly) zorunlu' });
        }
        // Aynı periyotta, aynı ikili arasında devam eden bir düello var mı? (pending/active)
        const now = new Date();
        const existing = await Duel.findOne({
            $or: [
                { challenger: challengerId, opponent: opponentId },
                { challenger: opponentId, opponent: challengerId }
            ],
            period,
            status: { $in: ['pending', 'active'] },
            endDate: { $gt: now }
        });
        if (existing) {
            return res.status(409).json({ message: 'Bu kişi ile bu dönem için zaten aktif veya bekleyen bir düello var' });
        }
        const { start, end } = getPeriodRange(period);
        const duel = await Duel.create({
            challenger: challengerId,
            opponent: opponentId,
            period,
            startDate: start,
            endDate: end,
            status: 'pending'
        });
        res.status(201).json({ message: 'Düello daveti oluşturuldu', data: duel });
    } catch (error) {
        console.error('POST /duels/invite error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /duels/:id/respond - Düello davetini kabul/ret
router.post('/:id/respond', authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { accept } = req.body;
        const duel = await Duel.findById(id);
        if (!duel) return res.status(404).json({ message: 'Düello bulunamadı' });
        if (String(duel.opponent) !== String(userId)) {
            return res.status(403).json({ message: 'Bu düelloya cevap verme yetkiniz yok' });
        }
        if (duel.status !== 'pending') {
            return res.status(400).json({ message: 'Bu düellonun durumu değiştirilemez' });
        }
        duel.status = accept ? 'active' : 'declined';
        await duel.save();

        // Eğer kabul edildiyse, aynı ikili ve periyottaki diğer pending düelloları iptal et
        if (accept) {
            const now = new Date();
            await Duel.updateMany({
                _id: { $ne: duel._id },
                period: duel.period,
                endDate: { $gt: now },
                status: 'pending',
                $or: [
                    { challenger: duel.challenger, opponent: duel.opponent },
                    { challenger: duel.opponent, opponent: duel.challenger }
                ]
            }, { $set: { status: 'cancelled' } });
        }
        res.status(200).json({ message: accept ? 'Düello kabul edildi' : 'Düello reddedildi', data: duel });
    } catch (error) {
        console.error('POST /duels/:id/respond error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /duels - Kullanıcının tüm düelloları
router.get('/', authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const duels = await Duel.find({ $or: [{ challenger: userId }, { opponent: userId }] })
            .sort({ createdAt: -1 })
            .populate('challenger', 'name email avatar')
            .populate('opponent', 'name email avatar');
        res.status(200).json({ message: 'Düellolar getirildi', data: duels });
    } catch (error) {
        console.error('GET /duels error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /duels/active - Aktif düellolar + anlık skorlar
router.get('/active', authenticateToken, checkRole('student'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const now = new Date();
        const duels = await Duel.find({
            $or: [{ challenger: userId }, { opponent: userId }],
            status: { $in: ['active', 'pending'] },
            endDate: { $gt: now }
        }).populate('challenger', 'name email avatar').populate('opponent', 'name email avatar');

        // Skorları hesapla
        const withScores = await Promise.all(duels.map(async d => {
            const cMin = await computeUserStudyMinutes(d.challenger, d.startDate, d.endDate);
            const oMin = await computeUserStudyMinutes(d.opponent, d.startDate, d.endDate);
            return { ...d.toObject(), liveScores: { challengerStudyTimeMin: cMin, opponentStudyTimeMin: oMin } };
        }));
        res.status(200).json({ message: 'Aktif düellolar', data: withScores });
    } catch (error) {
        console.error('GET /duels/active error:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /duels/:id/complete - Süre bittiğinde sonucu belirle
router.post('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const duel = await Duel.findById(id);
        if (!duel) return res.status(404).json({ message: 'Düello bulunamadı' });
        if (duel.status === 'completed') return res.status(400).json({ message: 'Düello zaten tamamlandı' });
        const cMin = await computeUserStudyMinutes(duel.challenger, duel.startDate, duel.endDate);
        const oMin = await computeUserStudyMinutes(duel.opponent, duel.startDate, duel.endDate);
        let winnerUserId = null;
        if (cMin > oMin) winnerUserId = duel.challenger;
        else if (oMin > cMin) winnerUserId = duel.opponent;
        duel.status = 'completed';
        duel.results = {
            challengerStudyTimeMin: cMin,
            opponentStudyTimeMin: oMin,
            winnerUserId,
            completedAt: new Date()
        };
        await duel.save();
        res.status(200).json({ message: 'Düello tamamlandı', data: duel });
    } catch (error) {
        console.error('POST /duels/:id/complete error:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /duels/room/activity?period=daily|weekly - Çalışma odası: herkesin aktivitesi
router.get('/room/activity', authenticateToken, async (req, res) => {
    try {
        const { period = 'daily' } = req.query;
        if (!['daily','weekly'].includes(String(period))) {
            return res.status(400).json({ message: 'Geçersiz period' });
        }
        const { start, end } = getPeriodRange(String(period));

        // Dönem içinde çalışma yapanların toplamları
        const activity = await StudySession.aggregate([
            { $match: { date: { $gte: start, $lt: end } } },
            { $group: { _id: '$userId', totalTime: { $sum: '$duration' }, sessions: { $sum: 1 }, lastActivity: { $max: '$date' } } }
        ]);

        // Tüm öğrencileri getir (aktif kullanıcılar)
        const Users = require('../models/Users');
        const students = await Users.find({ role: 'student', isActive: true }).select('firstName lastName email avatar stats.lastActivity').limit(1000);

        // Map: userId -> aggregated
        const aggMap = new Map(activity.map(a => [String(a._id), a]));

        // Öğrencileri toplamlarla birleştir; yoksa 0 dakika
        const combined = students.map(s => {
            const key = String(s._id);
            const agg = aggMap.get(key);
            const name = (s.firstName || s.lastName) ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : (s.email?.split('@')[0] || 'Kullanıcı');
            return {
                userId: s._id,
                name,
                avatar: s.avatar || null,
                totalTime: agg ? agg.totalTime : 0,
                sessions: agg ? agg.sessions : 0,
                lastActivity: agg ? agg.lastActivity : (s.stats?.lastActivity || null)
            };
        });

        // Toplam süreye göre sırala ve sınırla
        combined.sort((a, b) => (b.totalTime - a.totalTime));
        const limited = combined.slice(0, 100);

        res.status(200).json({ message: 'Çalışma odası aktivitesi', data: limited });
    } catch (error) {
        console.error('GET /duels/room/activity error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;


