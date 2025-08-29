const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const HabitRoutine = require('../models/HabitRoutine');
const HabitLog = require('../models/HabitLog');
const Achievement = require('../models/Achievement');
const { rateLimiter } = require('../middlewares/rateLimiter');
const { broadcast, sseHandler } = require('../events/habitEvents');

// Basic validation helpers (lightweight; no external lib)
function validateTime(str){ return typeof str === 'string' && /^\d{2}:\d{2}$/.test(str); }
function validateRoutinePayload(body){
  const errors = [];
  if(!body.name || typeof body.name !== 'string') errors.push('name gerekli');
  if(body.schedule){
    if(!validateTime(body.schedule.timeStart)) errors.push('schedule.timeStart format HH:MM olmalı');
    if(body.schedule.timeEnd && !validateTime(body.schedule.timeEnd)) errors.push('schedule.timeEnd format HH:MM olmalı');
    if(body.schedule.recurrence === 'custom' && (!Array.isArray(body.schedule.daysOfWeek) || body.schedule.daysOfWeek.length===0)) errors.push('custom recurrence için daysOfWeek gerekli');
  } else errors.push('schedule gerekli');
  if(body.metrics && body.metrics.difficulty && (body.metrics.difficulty <1 || body.metrics.difficulty>5)) errors.push('difficulty 1-5');
  return errors;
}

// Overlap check (simplified: same timeStart & any common active day)
async function hasTimeConflict(userId, schedule, excludeId){
  if(!schedule || !schedule.timeStart) return false;
  const q = { userId, status: { $ne:'archived' }, 'schedule.timeStart': schedule.timeStart };
  if(excludeId) q._id = { $ne: excludeId };
  const existing = await HabitRoutine.find(q).lean();
  if(!existing.length) return false;
  // If recurrence is daily or weekdays/weekends, treat as broad; any match counts
  function expand(rec, days){
    if(rec==='daily') return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    if(rec==='weekdays') return ['Mon','Tue','Wed','Thu','Fri'];
    if(rec==='weekends') return ['Sat','Sun'];
    return days || [];
  }
  const newDays = new Set(expand(schedule.recurrence, schedule.daysOfWeek));
  for(const r of existing){
    const days = new Set(expand(r.schedule.recurrence, r.schedule.daysOfWeek));
    for(const d of newDays){ if(days.has(d)) return true; }
  }
  return false;
}

// SSE endpoint (placed before auth middleware usage for other routes; we still authenticate inside handler via middleware composition)
router.get('/events', authenticateToken, (req,res)=> sseHandler(req,res));

router.use(authenticateToken);
// Shared rate limiting (lightweight, in-memory)
router.use('/routines', rateLimiter({ id: 'habit-routines', windowMs: 60_000, max: 120, key: req=>req.user.userId }));
router.use('/logs', rateLimiter({ id: 'habit-logs', windowMs: 60_000, max: 180, key: req=>req.user.userId }));
router.use('/summary', rateLimiter({ id: 'habit-summary', windowMs: 30_000, max: 30, key: req=>req.user.userId }));
router.use('/heatmap', rateLimiter({ id: 'habit-heatmap', windowMs: 30_000, max: 30, key: req=>req.user.userId }));
router.use('/risk', rateLimiter({ id: 'habit-risk', windowMs: 30_000, max: 30, key: req=>req.user.userId }));

function startOfUTC(date){
  const d = new Date(date); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// List routines (+ today status optional)
router.get('/routines', async (req,res)=>{
  try {
    const userId = req.user.userId;
    const routines = await HabitRoutine.find({ userId, status: { $ne: 'archived' } }).sort({ order: 1, 'schedule.timeStart': 1 });
    const today = startOfUTC(new Date());
    const logs = await HabitLog.find({ userId, date: today }).lean();
    const logMap = new Map(logs.map(l=>[String(l.habitRoutineId), l]));
    const list = routines.map(r=>({
      ...r.toObject(),
      todayLog: logMap.get(String(r._id)) || null
    }));
    try { broadcast('habit_routines_list', { userId, count: list.length }); } catch(_e){}
    res.json({ message: 'Rutinler', data: list });
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// Create routine
router.post('/routines', async (req,res)=>{
  try {
    const userId = req.user.userId;
    const body = req.body || {};
  const errs = validateRoutinePayload(body);
  if (errs.length) return res.status(422).json({ message: 'Validasyon', errors: errs });
  if(await hasTimeConflict(userId, body.schedule)) return res.status(409).json({ message:'Aynı saat ve günlerde başka rutin var' });
    const doc = await HabitRoutine.create({ userId, ...body });
  try { invalidateUserCaches(userId); } catch(_e){}
    res.status(201).json({ message: 'Oluşturuldu', data: doc });
  } catch(e){ res.status(400).json({ message: e.message }); }
});

// Update routine
router.put('/routines/:id', async (req,res)=>{
  try {
    const userId = req.user.userId; const id = req.params.id; const body = req.body || {};
    if (Object.keys(body).length){
      const errs = validateRoutinePayload({ ...body, schedule: body.schedule || {} });
      if (errs.length) return res.status(422).json({ message: 'Validasyon', errors: errs });
  if(body.schedule && await hasTimeConflict(userId, body.schedule, id)) return res.status(409).json({ message:'Aynı saat ve günlerde başka rutin var' });
    }
    const doc = await HabitRoutine.findOne({ _id: id, userId });
    if(!doc) return res.status(404).json({ message: 'Bulunamadı' });
    Object.assign(doc, body);
    await doc.save();
  try { invalidateUserCaches(userId); } catch(_e){}
    res.json({ message: 'Güncellendi', data: doc });
  } catch(e){ res.status(400).json({ message: e.message }); }
});

// Change status (pause/archive/reactivate)
router.patch('/routines/:id/status', async (req,res)=>{
  try {
    const userId = req.user.userId; const id = req.params.id; const { status } = req.body || {};
    if(!['active','archived','paused'].includes(status)) return res.status(400).json({ message: 'Geçersiz status'});
    const doc = await HabitRoutine.findOneAndUpdate({ _id:id, userId }, { status }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Bulunamadı' });
  try { invalidateUserCaches(userId); } catch(_e){}
    res.json({ message: 'Durum güncellendi', data: doc });
  } catch(e){ res.status(400).json({ message: e.message }); }
});

// Delete (soft -> archive)
router.delete('/routines/:id', async (req,res)=>{
  try {
    const userId = req.user.userId; const id = req.params.id;
    const doc = await HabitRoutine.findOneAndUpdate({ _id:id, userId }, { status: 'archived' }, { new: true });
    if(!doc) return res.status(404).json({ message: 'Bulunamadı' });
  try { invalidateUserCaches(userId); } catch(_e){}
    res.json({ message: 'Arşivlendi', data: { id }});
  } catch(e){ res.status(400).json({ message: e.message }); }
});

// List logs
router.get('/logs', async (req,res)=>{
  try {
    const userId = req.user.userId;
    const from = req.query.from ? startOfUTC(req.query.from) : null;
    const to = req.query.to ? startOfUTC(req.query.to) : null;
    const habitId = req.query.habitId;
    const q = { userId };
    if (habitId) q.habitRoutineId = habitId;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to) q.date.$lte = to;
    }
    const items = await HabitLog.find(q).sort({ date: -1 });
    res.json({ message: 'Loglar', data: items });
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// Mark (done / skip)
router.post('/routines/:id/logs', async (req,res)=>{
  try {
    const userId = req.user.userId; const id = req.params.id; const { date, action } = req.body || {};
    if(!['done','skip'].includes(action)) return res.status(400).json({ message: 'Geçersiz action'});
    const routine = await HabitRoutine.findOne({ _id:id, userId, status: { $ne:'archived' } });
    if(!routine) return res.status(404).json({ message: 'Rutin yok'});
    const day = startOfUTC(date || new Date());
    let log = await HabitLog.findOne({ userId, habitRoutineId: routine._id, date: day });
    if(!log){ log = await HabitLog.create({ userId, habitRoutineId: routine._id, date: day }); }
    if(action === 'skip') {
      log.status = 'skipped';
      await log.save();
      return res.json({ message: 'Skip kaydedildi', data: log });
    }
    // done
    const now = new Date();
    log.completedAt = now;
    // lateness hesapla
    const [hh,mm] = routine.schedule.timeStart.split(':').map(Number);
    const planned = new Date(day); planned.setUTCHours(hh, mm, 0, 0);
    const diffMin = Math.max(0, Math.round((now - planned)/60000));
    log.latenessMinutes = diffMin;
    log.status = diffMin > routine.behavior.toleranceMinutes ? 'late' : 'done';
    // streak & resistance güncelle
    const yesterday = new Date(day); yesterday.setUTCDate(yesterday.getUTCDate()-1);
    const prevLog = await HabitLog.findOne({ userId, habitRoutineId: routine._id, date: yesterday });
    let newStreak;
    if(prevLog && ['done','late','auto'].includes(prevLog.status)) newStreak = (routine.metrics.currentStreak || 0) + 1; else newStreak = 1;
    routine.metrics.currentStreak = newStreak;
    if(newStreak > routine.metrics.longestStreak) routine.metrics.longestStreak = newStreak;
    // simple resistance model
    const k = 0.18; const base = (routine.metrics.difficulty || routine.metrics.difficulty === 0) ? routine.metrics.difficulty : 3;
    const resistance = Math.max(1, Math.round(base * 2 * Math.exp(-k * newStreak)));
    log.resistanceScoreSnapshot = resistance;
    log.streakAfter = newStreak;
    routine.metrics.lastLogDate = day;
    await Promise.all([log.save(), routine.save()]);

    // Gamification: XP & Achievement (best-effort)
    try {
      const { addXP } = require('../services/xpService');
      let baseXP = routine.gamification?.xpOnComplete || 5;
      const streak = routine.metrics.currentStreak;
      const streakBonus = Math.min(streak, 30) * 0.6; // basit bonus
      if (log.status === 'late') baseXP *= 0.8; // gecikme cezası
        try { invalidateUserCaches(userId); } catch(_e){}
      const totalXP = Math.round(baseXP + streakBonus);
      if (totalXP > 0) {
        await addXP(userId, totalXP, 'habit', { habitId: routine._id, streak });
      }
      // Achievement thresholds
      const thresholds = [3,7,14,21,30,50,75,100];
      if (thresholds.includes(streak)) {
        const title = `Alışkanlık Streak ${streak}`;
        const existing = await Achievement.findOne({ userId, category: 'habit_streak', 'seriesKey': 'habit_streak_generic', tier: streak });
        if (!existing) {
          await Achievement.create({
            userId,
            title,
            description: `${streak} gün üst üste alışkanlık tamamladın` ,
            icon: '🔥',
            points: 10 + streak, // simple scaling
            category: 'habit_streak',
            rarity: streak >= 50 ? 'epic' : (streak >= 21 ? 'rare' : 'common'),
            seriesKey: 'habit_streak_generic',
            tier: streak,
            progressType: 'streak',
            targetValue: streak,
            currentValue: streak,
            unlockedAt: new Date()
          });
      try { invalidateUserCaches(userId); } catch(_e){}
        }
      }
    } catch (ge) { /* silent gamification error */ }
  try { broadcast('habit_completed', { userId, habitId: routine._id, logId: log._id, streak: routine.metrics.currentStreak, status: log.status }); } catch(_e){}
  res.json({ message: 'Tamamlandı', data: log });
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// Summary (basic)
router.get('/summary', async (req,res)=>{
  try {
    const userId = req.user.userId;
    const days = parseInt(req.query.days || '30',10);
    const from = startOfUTC(new Date(Date.now() - (days-1)*86400000));
    const logs = await HabitLog.find({ userId, date: { $gte: from } });
    const map = {};
    for(const l of logs){
      if(!map[l.habitRoutineId]) map[l.habitRoutineId] = { done:0, late:0, missed:0, skipped:0, auto:0, total:0 };
      map[l.habitRoutineId][l.status] = (map[l.habitRoutineId][l.status]||0)+1;
      map[l.habitRoutineId].total++;
    }
    res.json({ message: 'Özet', data: map });
  } catch(e){ res.status(500).json({ message: e.message }); }
});

// Heatmap endpoint: son X gün (default 30) planlanan vs tamamlanan hücreler
router.get('/heatmap', async (req,res) => {
  try {
    const userId = req.user.userId;
    const days = Math.min(120, parseInt(req.query.days || '30', 10));
    const from = new Date(Date.now() - (days-1)*86400000);
    from.setUTCHours(0,0,0,0);
    const routines = await HabitRoutine.find({ userId, status: 'active' });
    const logs = await HabitLog.find({ userId, date: { $gte: from } });
    const routineMap = new Map(routines.map(r=>[String(r._id), r]));
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const cells = {}; // key: DOW-HH
    function inc(key, field){ if(!cells[key]) cells[key]={ planned:0, completed:0, missed:0, late:0, skipped:0 }; cells[key][field]++; }
    // For each log count planned + status
    for (const log of logs) {
      const r = routineMap.get(String(log.habitRoutineId)); if(!r) continue;
      const dow = dayNames[new Date(log.date).getUTCDay()];
      const hour = (r.schedule?.timeStart||'00:00').slice(0,2);
      const key = `${dow}-${hour}`;
      inc(key,'planned');
      if (['done','auto'].includes(log.status)) inc(key,'completed');
      else if (log.status === 'late') { inc(key,'completed'); inc(key,'late'); }
      else if (log.status === 'missed') inc(key,'missed');
      else if (log.status === 'skipped') inc(key,'skipped');
    }
    // Compute successRate & derive strongest/weakest
    const result = Object.entries(cells).map(([key,val])=>({
      key,
      planned: val.planned,
      completed: val.completed,
      successRate: val.planned? +( (val.completed/val.planned)*100 ).toFixed(1): 0,
      missed: val.missed,
      late: val.late,
      skipped: val.skipped
    }));
    const sorted = [...result].sort((a,b)=>a.successRate-b.successRate).filter(r=>r.planned>=2);
    res.json({
      message: 'Heatmap',
      data: {
        rangeDays: days,
        cells: result,
        weakest: sorted.slice(0,5),
        strongest: [...sorted].reverse().slice(0,5)
      }
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// (Risk endpoint removed here to avoid duplication; use /api/habit-analytics/risk instead)

module.exports = router;
