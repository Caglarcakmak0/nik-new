/**
 * HABIT ANALYTICS ROUTES
 * /api/habit-analytics/*
 * Odak: Alışkanlıkların gelişmiş istatistikleri, trendler ve risk değerlendirmesi (read-only)
 */
const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const HabitRoutine = require('../models/HabitRoutine');
const HabitLog = require('../models/HabitLog');
const { computeRiskForUser, computeHeatmapForUser } = require('../services/habitAnalyticsService');
const { rateLimiter } = require('../middlewares/rateLimiter');
const { broadcast } = require('../events/habitEvents');

router.use(authenticateToken);
router.use(rateLimiter({ id:'habit-analytics', windowMs: 30_000, max: 60, key: req=>req.user.userId }));

// Basit in-memory cache (key -> {expires, data})
const cache = new Map();
function cGet(key){ const e = cache.get(key); if(!e) return null; if(Date.now()>e.expires){ cache.delete(key); return null;} return e.data; }
function cSet(key,data,ttlMs=30*1000){ cache.set(key,{data,expires:Date.now()+ttlMs}); }

function startOfUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Shared risk computation helper
function computeRisk(routines, logs, daysWindow=14) {
  const logsByHabit = new Map();
  for (const l of logs) {
    const key = String(l.habitRoutineId);
    if(!logsByHabit.has(key)) logsByHabit.set(key, []);
    logsByHabit.get(key).push(l);
  }
  for (const arr of logsByHabit.values()) arr.sort((a,b)=>a.date-b.date);
  function resistanceScore(r){ const streak=r.metrics?.currentStreak||0; const diff=r.metrics?.difficulty||3; const base=diff*2; const k=0.18; return Math.max(1, Math.round(base*Math.exp(-k*streak))); }
  const today = startOfUTC(new Date());
  const from = new Date(today); from.setUTCDate(from.getUTCDate()-(daysWindow-1));
  const results=[];
  for(const r of routines){
    const habitId=String(r._id); const habitLogs=logsByHabit.get(habitId)||[];
    const dayStats=[]; for(let d=0; d<daysWindow; d++){ const day=new Date(from); day.setUTCDate(from.getUTCDate()+d); if(!(r.isPlannedForDate && r.isPlannedForDate(day))) continue; const log=habitLogs.find(l=> l.date.getTime()===day.getTime()); const success= log? ['done','late','auto'].includes(log.status):false; dayStats.push({date:day,success}); }
    const last7=dayStats.slice(-7); const sr7= last7.length? last7.filter(x=>x.success).length/ last7.length:0; const sr14= dayStats.length? dayStats.filter(x=>x.success).length / dayStats.length:0;
    let changes=0; for(let i=1;i<dayStats.length;i++){ if(dayStats[i].success!==dayStats[i-1].success) changes++; }
    const volatility= dayStats.length>1? changes/(dayStats.length-1):0;
    const yesterday = new Date(today); yesterday.setUTCDate(today.getUTCDate()-1);
    const yLog = habitLogs.find(l=> l.date.getTime()===yesterday.getTime()); const missedYesterday= !!(yLog && yLog.status==='missed');
    const streak=r.metrics?.currentStreak||0; const resistance = resistanceScore(r);
    let risk=(1-sr7)*0.5 + (1-sr14)*0.2 + volatility*0.2 + (resistance/10)*0.1; if(missedYesterday) risk+=0.15; if(streak>=7 && risk>0.6) risk-=0.1; risk=Math.min(1,Math.max(0,risk)); const level= risk<0.33?'low':(risk<0.66?'medium':'high');
    results.push({ habitId, name:r.name, type:r.type, streak, successRate7:+(sr7*100).toFixed(1), successRate14:+(sr14*100).toFixed(1), volatility:+(volatility*100).toFixed(1), resistance, missedYesterday, riskScore:+(risk*100).toFixed(1), riskLevel:level });
  }
  results.sort((a,b)=>b.riskScore-a.riskScore);
  return results;
}

// Overview
router.get('/overview', async (req,res)=>{
  try {
    const userId = req.user.userId; const cacheKey=`ov:${userId}`; const cached=cGet(cacheKey); if(cached) return res.json(cached);
    const routines = await HabitRoutine.find({ userId, status: 'active' });
    const days = 30; const from = new Date(Date.now()-(days-1)*86400000); from.setUTCHours(0,0,0,0);
    const logs = await HabitLog.find({ userId, date: { $gte: from } });
    const totals = { planned:0, completed:0, late:0, missed:0, skipped:0 };
    for(const log of logs){
      totals.planned++; if(['done','auto'].includes(log.status)) totals.completed++; else if(log.status==='late'){ totals.completed++; totals.late++; } else if(log.status==='missed') totals.missed++; else if(log.status==='skipped') totals.skipped++; }
    const consistency = totals.planned? +( (totals.completed / totals.planned)*100 ).toFixed(1):0;
    const avgStreak = routines.length? Math.round(routines.reduce((a,r)=>a+(r.metrics?.currentStreak||0),0)/routines.length):0;
    const longestStreak = routines.reduce((m,r)=> Math.max(m, r.metrics?.longestStreak||0), 0);
    const payload = { message:'Overview', data:{ consistency, avgStreak, longestStreak, activeHabits: routines.length, totals } };
    cSet(cacheKey,payload,15000); res.json(payload);
  } catch(e){ res.status(500).json({ message: e.message }); }
});

router.get('/heatmap', async (req,res)=>{
  try { const userId=req.user.userId; const days=Math.min(120, parseInt(req.query.days||'30',10)); const data = await computeHeatmapForUser(userId, days); res.json({ message:'Heatmap', data:{ rangeDays: data.days, cells: data.cells } }); } catch(e){ res.status(500).json({ message:e.message }); }
});

// Risk
router.get('/risk', async (req,res)=>{
  try {
    const userId=req.user.userId; const data= await computeRiskForUser(userId,14);
    try { broadcast('habit_risk_snapshot', { userId, count: data.length }); } catch(_e){}
    // High risk notification (best-effort) – dedupe per day per habit
    (async ()=>{
      try {
        const Notification = require('../models/Notification');
        const todayKey = new Date().toISOString().slice(0,10);
        for(const item of data.filter(d=> d.riskLevel==='high')){
          const dedupeKey = `habit_high_risk:${item.habitId}:${todayKey}`;
            await Notification.findOneAndUpdate(
              { userId, dedupeKey },
              { $setOnInsert: {
                  userId,
                  category:'gamification',
                  type:'habit_high_risk',
                  title:`Riskli alışkanlık: ${item.name}`,
                  body:`Son günlerde başarı düşüşü. Streak: ${item.streak}, 7g başarı %${item.successRate7}`,
                  importance:'high',
                  dedupeKey,
                  meta:{ habitId: item.habitId, riskScore: item.riskScore }
                }
              },
              { upsert:true, new:false }
            ).catch(()=>{});
        }
      } catch(_e){}
    })();
    res.json({ message:'Risk', data });
  } catch(e){ res.status(500).json({ message:e.message }); }
});

// Trends: günlük başarı yüzdesi (son N gün)
router.get('/trends', async (req,res)=>{
  try { const userId=req.user.userId; const days = Math.min(90, parseInt(req.query.days||'30',10)); const from = new Date(Date.now()-(days-1)*86400000); from.setUTCHours(0,0,0,0); const logs= await HabitLog.find({ userId, date:{ $gte: from } }); const byDate = new Map(); for(const l of logs){ const key=l.date.toISOString().slice(0,10); if(!byDate.has(key)) byDate.set(key,{ planned:0, completed:0 }); const d=byDate.get(key); d.planned++; if(['done','auto'].includes(l.status) || l.status==='late') d.completed++; }
    const series = [...byDate.entries()].sort((a,b)=> a[0].localeCompare(b[0])).map(([date,v])=>({ date, planned:v.planned, completed:v.completed, successRate: v.planned? +((v.completed/v.planned)*100).toFixed(1):0 }));
    res.json({ message:'Trends', data:{ days, series } });
  } catch(e){ res.status(500).json({ message: e.message }); }
});

module.exports = router;
