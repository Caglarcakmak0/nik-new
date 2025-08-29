const HabitRoutine = require('../models/HabitRoutine');
const HabitLog = require('../models/HabitLog');

function startOfUTC(d){ return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function resistanceScore(r){ const streak=r.metrics?.currentStreak||0; const diff=r.metrics?.difficulty||3; const base=diff*2; const k=0.18; return Math.max(1, Math.round(base*Math.exp(-k*streak))); }

// Simple in-memory per user cache (short TTL)
const _cache = new Map(); // key -> {expires,data}
function _getC(k){ const e=_cache.get(k); if(!e) return null; if(Date.now()>e.expires){ _cache.delete(k); return null;} return e.data; }
function _setC(k,d,ttl=15000){ _cache.set(k,{data:d,expires:Date.now()+ttl}); }

async function computeRiskForUser(userId, daysWindow=14){
  const key = `risk:${userId}:${daysWindow}`; const cached=_getC(key); if(cached) return cached;
  const today = startOfUTC(new Date());
  const from = new Date(today); from.setUTCDate(from.getUTCDate()-(daysWindow-1));
  const [routines, logs] = await Promise.all([
    HabitRoutine.find({ userId, status:'active' }),
    HabitLog.find({ userId, date:{ $gte: from } })
  ]);
  const logsByHabit = new Map();
  for(const l of logs){ const k=String(l.habitRoutineId); if(!logsByHabit.has(k)) logsByHabit.set(k, []); logsByHabit.get(k).push(l); }
  for(const arr of logsByHabit.values()) arr.sort((a,b)=>a.date-b.date);
  const results=[];
  for(const r of routines){
    const habitId=String(r._id); const habitLogs=logsByHabit.get(habitId)||[];
    const dayStats=[]; for(let d=0; d<daysWindow; d++){ const day=new Date(from); day.setUTCDate(from.getUTCDate()+d); if(!(r.isPlannedForDate && r.isPlannedForDate(day))) continue; const log=habitLogs.find(l=> l.date.getTime()===day.getTime()); const success= log? ['done','late','auto'].includes(log.status):false; dayStats.push({date:day,success}); }
    const last7=dayStats.slice(-7); const sr7= last7.length? last7.filter(x=>x.success).length/ last7.length:0; const sr14= dayStats.length? dayStats.filter(x=>x.success).length/ dayStats.length:0;
    let changes=0; for(let i=1;i<dayStats.length;i++){ if(dayStats[i].success!==dayStats[i-1].success) changes++; }
    const volatility= dayStats.length>1? changes/(dayStats.length-1):0;
    const yesterday=new Date(today); yesterday.setUTCDate(today.getUTCDate()-1); const yLog=habitLogs.find(l=> l.date.getTime()===yesterday.getTime()); const missedYesterday= !!(yLog && yLog.status==='missed');
    const streak=r.metrics?.currentStreak||0; const resistance=resistanceScore(r); let risk=(1-sr7)*0.5 + (1-sr14)*0.2 + volatility*0.2 + (resistance/10)*0.1; if(missedYesterday) risk+=0.15; if(streak>=7 && risk>0.6) risk-=0.1; risk=Math.min(1,Math.max(0,risk)); const level= risk<0.33?'low':(risk<0.66?'medium':'high');
    results.push({ habitId, name:r.name, type:r.type, streak, successRate7:+(sr7*100).toFixed(1), successRate14:+(sr14*100).toFixed(1), volatility:+(volatility*100).toFixed(1), resistance, missedYesterday, riskScore:+(risk*100).toFixed(1), riskLevel:level });
  }
  results.sort((a,b)=>b.riskScore - a.riskScore);
  _setC(key, results);
  return results;
}

async function computeHeatmapForUser(userId, days=30){
  const key = `heat:${userId}:${days}`; const cached=_getC(key); if(cached) return cached;
  const from = new Date(Date.now()-(days-1)*86400000); from.setUTCHours(0,0,0,0);
  const [routines, logs] = await Promise.all([
    HabitRoutine.find({ userId, status:'active' }),
    HabitLog.find({ userId, date:{ $gte: from } })
  ]);
  const routineMap = new Map(routines.map(r=>[String(r._id), r]));
  const cells={}; function inc(k,f){ if(!cells[k]) cells[k]={ planned:0, completed:0, missed:0, late:0, skipped:0 }; cells[k][f]++; }
  for(const log of logs){ const r = routineMap.get(String(log.habitRoutineId)); if(!r) continue; const dow=dayNames[new Date(log.date).getUTCDay()]; const hour=(r.schedule?.timeStart||'00:00').slice(0,2); const key=`${dow}-${hour}`; inc(key,'planned'); if(['done','auto'].includes(log.status)) inc(key,'completed'); else if(log.status==='late'){ inc(key,'completed'); inc(key,'late'); } else if(log.status==='missed') inc(key,'missed'); else if(log.status==='skipped') inc(key,'skipped'); }
  const result = Object.entries(cells).map(([k,v])=>({ key:k, planned:v.planned, completed:v.completed, successRate: v.planned? +((v.completed/v.planned)*100).toFixed(1):0, missed:v.missed, late:v.late, skipped:v.skipped }));
  const payload = { days, cells: result };
  _setC(key, payload, 20000);
  return payload;
}

function invalidateUserCaches(userId){
  const prefixRisk = `risk:${userId}`;
  const prefixHeat = `heat:${userId}`;
  for(const k of [..._cache.keys()]){
    if(k.startsWith(prefixRisk) || k.startsWith(prefixHeat)) _cache.delete(k);
  }
}

module.exports = { computeRiskForUser, computeHeatmapForUser, invalidateUserCaches };