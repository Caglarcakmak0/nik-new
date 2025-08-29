const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth.js');
const ExamAttempt = require('../models/ExamAttempt');

// Build common serializer
function serialize(a){
  return {
    id: a._id,
    source: a.source,
    examType: a.examType,
    date: a.date,
    subjects: a.subjects,
    totals: a.totals,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt
  };
}

// GET /exam-attempts
router.get('/', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const { type, from, to, page = 1, limit = 50 } = req.query;
    const q = { userId };
    if (type) q.examType = type;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const lim = Math.min(Number(limit), 100);
    const skip = (Number(page)-1)*lim;
    const [items, total] = await Promise.all([
      ExamAttempt.find(q).sort({ date: -1, _id: -1 }).skip(skip).limit(lim),
      ExamAttempt.countDocuments(q)
    ]);
    res.json({ data: items.map(serialize), pagination:{ page:Number(page), total, totalPages: Math.ceil(total/lim) }});
  } catch(e){
    console.error('GET /exam-attempts error', e);
    res.status(500).json({ message:e.message });
  }
});

// POST /exam-attempts
router.post('/', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const { source, date, subjects, topics = [] } = req.body;
    if (!source || !date || !Array.isArray(subjects) || subjects.length===0) {
      return res.status(400).json({ message:'source, date, subjects required' });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ message:'Invalid date' });
    if (parsedDate.getTime() > Date.now()+ 86400000) return res.status(400).json({ message:'Date in future' });
    // sanitation numbers
    for (const s of subjects){
      ['correct','wrong','blank'].forEach(k=>{ if (typeof s[k] !== 'number' || s[k] < 0) s[k] = 0; });
    }
  const cleanTopics = Array.isArray(topics) ? topics.filter(t=> t && t.topic && t.subject).map(t=> ({ subject:t.subject, topic:t.topic, wrong: Math.max(0, Number(t.wrong)||0), asked: t.asked ? Math.max(0, Number(t.asked)||0) : undefined })) : [];
  const attempt = await ExamAttempt.create({ userId, source, date: parsedDate, subjects, topics: cleanTopics });
  try { // XP event (optional)
    const { addXP } = require('../services/xpService');
    const totalCorrect = attempt.totals.correct;
    await addXP(userId, Math.max(5, Math.round(totalCorrect * 0.5)), 'exam_attempt', { attemptId: attempt._id });
  } catch(err){ console.warn('XP add skip', err?.message); }
    res.status(201).json({ data: serialize(attempt) });
  } catch(e){
    console.error('POST /exam-attempts error', e);
    res.status(500).json({ message:e.message });
  }
});

// PUT /exam-attempts/:id
router.put('/:id', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const { id } = req.params;
    const attempt = await ExamAttempt.findById(id);
    if (!attempt || attempt.userId.toString()!==userId) return res.status(404).json({ message:'Not found' });
  const { source, date, subjects, topics } = req.body;
    if (source) attempt.source = source;
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ message:'Invalid date' });
      attempt.date = parsedDate;
    }
    if (subjects) {
      if (!Array.isArray(subjects) || subjects.length===0) return res.status(400).json({ message:'subjects must be non-empty array' });
      for (const s of subjects){
        ['correct','wrong','blank'].forEach(k=>{ if (typeof s[k] !== 'number' || s[k] < 0) s[k] = 0; });
      }
      attempt.subjects = subjects;
    }
    if (topics) {
      if (!Array.isArray(topics)) return res.status(400).json({ message:'topics must be array' });
      attempt.topics = topics.filter(t=> t && t.topic && t.subject).map(t=> ({ subject:t.subject, topic:t.topic, wrong: Math.max(0, Number(t.wrong)||0), asked: t.asked ? Math.max(0, Number(t.asked)||0) : undefined }));
    }
    await attempt.save();
    res.json({ data: serialize(attempt) });
  } catch(e){
    console.error('PUT /exam-attempts/:id error', e);
    res.status(500).json({ message:e.message });
  }
});

// DELETE /exam-attempts/:id
router.delete('/:id', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const { id } = req.params;
    const attempt = await ExamAttempt.findById(id);
    if (!attempt || attempt.userId.toString()!==userId) return res.status(404).json({ message:'Not found' });
    await attempt.deleteOne();
    res.json({ message:'Deleted' });
  } catch(e){
    console.error('DELETE /exam-attempts/:id error', e);
    res.status(500).json({ message:e.message });
  }
});

// GET /exam-attempts/stats/overview
router.get('/stats/overview', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const attempts = await ExamAttempt.find({ userId }).sort({ date: -1 }).limit(200); // cap for perf
    if (attempts.length === 0) return res.json({ data:{ lastAccuracy:0, delta:0, averageAccuracy:0, count:0, tyt:{ correct:0, wrong:0, blank:0, net:0, accuracy:0 }, ayt:{ correct:0, wrong:0, blank:0, net:0, accuracy:0 }}});
    const last = attempts[0];
    const rest = attempts.slice(1);
    const avg = attempts.reduce((acc,a)=> acc + a.totals.accuracy, 0)/attempts.length;
    const prevAcc = rest.length ? rest[0].totals.accuracy : last.totals.accuracy;
    const delta = last.totals.accuracy - prevAcc;
    const aggByType = { TYT:{correct:0,wrong:0,blank:0,net:0,count:0}, AYT:{correct:0,wrong:0,blank:0,net:0,count:0} };
    attempts.forEach(a=> { if (a.examType && aggByType[a.examType]) { const t=aggByType[a.examType]; t.correct+=a.totals.correct; t.wrong+=a.totals.wrong; t.blank+=a.totals.blank; t.net+=a.totals.net; t.count++; } });
    function finalize(t){ const answered = t.correct + t.wrong; return { correct:t.correct, wrong:t.wrong, blank:t.blank, net: t.net, accuracy: answered? t.correct/answered : 0 }; }
    res.json({ data: { lastAccuracy: last.totals.accuracy, delta, averageAccuracy: avg, count: attempts.length, tyt: finalize(aggByType.TYT), ayt: finalize(aggByType.AYT) } });
  } catch(e){
    console.error('GET /exam-attempts/stats/overview error', e);
    res.status(500).json({ message:e.message });
  }
});

// GET /exam-attempts/analytics/frequent-topics?limit=15&period=30d
router.get('/analytics/frequent-topics', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const { limit = 15, period = '30d' } = req.query;
    let fromDate;
    if (period !== 'all') {
      const m = String(period).match(/(\d+)d/);
      const days = m ? parseInt(m[1],10) : 30;
      fromDate = new Date(Date.now() - days*86400000);
    }
  const pipeline = [ { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } } ];
    if (fromDate) pipeline[0].$match.date = { $gte: fromDate };
    pipeline.push(
  { $unwind: '$topics' },
  { $group: { _id: '$topics.topic', wrong: { $sum: '$topics.wrong' }, subject: { $first: '$topics.subject' }, asked: { $sum: { $ifNull:['$topics.asked', 0] } } } },
  { $project: { _id:0, topic:'$_id', wrong:1, subject:1, accuracy: { $cond:[ { $gt:['$asked',0] }, { $divide:[ { $subtract:['$asked','$wrong'] }, '$asked' ] }, 0 ] } } },
      { $sort: { wrong: -1 } },
      { $limit: Math.min(Number(limit),50) }
    );
    const raw = await ExamAttempt.aggregate(pipeline);
    res.json({ data: raw });
  } catch(e){
    console.error('GET /exam-attempts/analytics/frequent-topics error', e);
    res.status(500).json({ message:e.message });
  }
});

// GET /exam-attempts/analytics/topic-history?topic=Matematik&range=30d|all
router.get('/analytics/topic-history', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const { topic, range='all' } = req.query;
    if (!topic) return res.status(400).json({ message:'topic required' });
    let fromDate;
    if (range !== 'all') {
      const m = String(range).match(/(\d+)d/);
      const days = m ? parseInt(m[1],10) : 30;
      fromDate = new Date(Date.now() - days*86400000);
    }
  const match = { userId: require('mongoose').Types.ObjectId.createFromHexString(userId), 'topics.topic': topic };
    if (fromDate) match.date = { $gte: fromDate };
    const pipeline = [
      { $match: match },
  { $unwind: '$topics' },
  { $match: { 'topics.topic': topic } },
  { $group: { _id: { day: { $dateToString: { format:'%Y-%m-%d', date:'$date' } } }, wrong:{ $sum:'$topics.wrong' }, asked:{ $sum:{ $ifNull:['$topics.asked',0] } } } },
      { $sort: { '_id.day': 1 } },
  { $project: { _id:0, date:'$_id.day', wrong:1, accuracy: { $cond:[ { $gt:['$asked',0] }, { $divide:[ { $subtract:['$asked','$wrong'] }, '$asked' ] }, 0 ] } } }
    ];
    const data = await ExamAttempt.aggregate(pipeline);
    res.json({ data });
  } catch(e){
    console.error('GET /exam-attempts/analytics/topic-history error', e);
    res.status(500).json({ message:e.message });
  }
});

// GET /exam-attempts/analytics/aggregate-history?type=TYT|AYT&bucket=day|week|month
router.get('/analytics/aggregate-history', authenticateToken, async (req,res)=>{
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message:'Unauthorized' });
    const { type, bucket='day', range='all' } = req.query;
    if (!type) return res.status(400).json({ message:'type required' });
    let fromDate;
    if (range !== 'all') {
      const m = String(range).match(/(\d+)d/);
      const days = m ? parseInt(m[1],10) : 90;
      fromDate = new Date(Date.now() - days*86400000);
    }
    const match = { userId: require('mongoose').Types.ObjectId.createFromHexString(userId), examType:type };
    if (fromDate) match.date = { $gte: fromDate };
    let dateExpr;
    if (bucket === 'month') {
      dateExpr = { $dateToString: { format:'%Y-%m', date:'$date' } };
    } else if (bucket === 'week') {
      // ISO week key approx: year-week
      dateExpr = { $concat: [ { $toString: { $isoWeekYear: '$date' } }, '-W', { $toString: { $isoWeek: '$date' } } ] };
    } else {
      dateExpr = { $dateToString: { format:'%Y-%m-%d', date:'$date' } };
    }
    const pipeline = [
      { $match: match },
      { $group: { _id: dateExpr, wrong:{ $sum:'$totals.wrong' }, correct:{ $sum:'$totals.correct' }, netAvg:{ $avg:'$totals.net' } } },
      { $sort: { _id: 1 } },
      { $project: { _id:0, bucket:'$_id', wrong:1, correct:1, netAvg: { $round:['$netAvg', 2] }, accuracy: { $cond:[ { $gt:[ { $add:['$wrong','$correct'] }, 0 ] }, { $divide:['$correct', { $add:['$wrong','$correct'] }] }, 0 ] } } }
    ];
    const data = await ExamAttempt.aggregate(pipeline);
    res.json({ data });
  } catch(e){
    console.error('GET /exam-attempts/analytics/aggregate-history error', e);
    res.status(500).json({ message:e.message });
  }
});

module.exports = router;
