// Unified AI suggestion rules file (cleaned duplication)
const AISuggestion = require('../models/AISuggestion');
const WeeklyPlan = require('../models/WeeklyPlan');
const ExamAttempt = require('../models/ExamAttempt');
const dayjs = require('dayjs');

// Helper build dedup key (consistent with schema usage)
function dedupKey(userId, type, subject, topic){
  return [userId, type, subject||'', topic||''].join('|');
}

// --- Rule: Missing Subject (not seen in last N days) ---
async function ruleMissingSubject(ctx){
  const { userId, plan, sinceDays=7 } = ctx;
  const cutoff = dayjs().subtract(sinceDays,'day').toDate();
  const subjectsRecent = new Set();
  if(plan){
    plan.entries.forEach(e=> { if(e.updatedAt && e.updatedAt > cutoff) subjectsRecent.add(e.subject); });
  }
  const candidateSubjects = ['matematik','matematik_ayt','turkce','fizik','kimya','biyoloji'];
  return candidateSubjects.filter(sub=> !subjectsRecent.has(sub)).map(sub=>{
    const msg = `${sub} son ${sinceDays} günde hiç görünmüyor. Bu hafta ekle.`;
    return {
      type:'missing_subject', subject:sub, topic:null,
      scopes:['weekly_plan','dashboard'],
      messages:{ default: msg, weekly_plan: msg, dashboard: msg },
      weight:6,
      sourceSignals:[{ kind:'recencyGap', data:{ days: sinceDays } }]
    };
  });
}

// --- Rule: Imbalance (one subject dominates week) ---
function ruleImbalance(ctx){
  const { plan } = ctx;
  if(!plan || !plan.entries.length) return [];
  const counts = {};
  plan.entries.forEach(e=> { counts[e.subject] = (counts[e.subject]||0)+1; });
  const entries = plan.entries.length;
  const sorted = Object.entries(counts).sort((a,b)=> b[1]-a[1]);
  if(!sorted.length) return [];
  const [topSub, topCount] = sorted[0];
  if(topCount < Math.max(3, Math.ceil(entries*0.5))) return [];
  const msg = `${topSub} dersine aşırı ağırlık vermişsin (%${Math.round((topCount/entries)*100)}). Diğer derslerle dengele.`;
  return [{
    type:'imbalance', subject: topSub, topic:null,
    scopes:['weekly_plan','dashboard'],
    messages:{ default: msg, weekly_plan: msg, dashboard: msg },
    weight:4,
    sourceSignals:[{ kind:'dominance', data:{ subject: topSub, ratio: topCount/entries } }]
  }];
}

// --- Rule: Weak Topics (exam tracker) ---
function ruleWeakTopics(ctx){
  const { attempts } = ctx;
  if(!attempts || attempts.length===0) return [];
  const topicStats = new Map(); // key subject|topic -> {subject, topic, wrong, asked}
  attempts.forEach(a=>{
    (a.topics||[]).forEach(t=>{
      if(!t.topic || !t.subject) return;
      const key = t.subject+'|'+t.topic;
      const ex = topicStats.get(key) || { subject:t.subject, topic:t.topic, wrong:0, asked:0 };
      ex.wrong += t.wrong || 0;
      ex.asked += (t.asked != null ? t.asked : (t.wrong || 0));
      topicStats.set(key, ex);
    });
  });
  const MIN_WRONG = 3;
  const OUT = Array.from(topicStats.values())
    .filter(s=> s.wrong >= MIN_WRONG && (s.asked === 0 || ( (s.asked - s.wrong)/s.asked ) < 0.7 ))
    .sort((a,b)=> b.wrong - a.wrong)
    .slice(0,5)
    .map(s=>{
      const msg = `${s.topic} konusunda son denemelerde ${s.wrong} yanlış var. Tekrar çalış.`;
      return {
        type:'weak_topic', subject:s.subject, topic:s.topic,
        scopes:['exam_tracker','weekly_plan'],
        messages:{ default: msg, exam_tracker: msg, weekly_plan: msg },
        weight:8,
        sourceSignals:[{ kind:'topicAggregate', data:s }]
      };
    });
  return OUT;
}

// --- Rule: No Recent Exam ---
function ruleNoRecentExam(ctx){
  const { lastExamDate } = ctx;
  const DAYS = 7;
  if(lastExamDate && dayjs().diff(dayjs(lastExamDate), 'day') <= DAYS) return [];
  const msg = `Son ${DAYS}+ günde deneme yok. Bu hafta bir TYT denemesi planla.`;
  return [{
    type:'no_recent_exam', subject:null, topic:null,
    scopes:['exam_tracker','weekly_plan','dashboard'],
    messages:{ default: msg, exam_tracker: msg, weekly_plan: msg, dashboard: msg },
    weight:6,
    sourceSignals:[{ kind:'examGap', data:{ days:DAYS, lastExamDate } }]
  }];
}

// --- Rule: Stagnating Accuracy (no improvement across last K attempts) ---
function ruleStagnatingAccuracy(ctx){
  const { attempts } = ctx;
  const MIN = 4; // need at least 4 attempts to observe trend
  if(!attempts || attempts.length < MIN) return [];
  const recent = [...attempts].slice(0, MIN).map(a=> a.totals?.accuracy || 0);
  // reverse chronological already (attempts sorted by date desc in generator)
  const deltas = [];
  for(let i=0;i<recent.length-1;i++) deltas.push(recent[i] - recent[i+1]);
  const netGain = recent[0] - recent[recent.length-1];
  const improving = netGain > 0.05; // >5% absolute improvement
  const anyBigJump = deltas.some(d=> d > 0.03);
  if(improving || anyBigJump) return [];
  const avg = recent.reduce((a,b)=>a+b,0)/recent.length;
  if(avg >= 0.85) return []; // already high, no need
  const msg = `Son ${MIN} denemede net ilerleme yok (ortalama doğruluk %${Math.round(avg*100)}). Yanlışları analize ayır ve hedefli tekrar yap.`;
  return [{
    type:'stagnating_accuracy', subject:null, topic:null,
    scopes:['exam_tracker','dashboard','weekly_plan'],
    messages:{ default: msg, exam_tracker: msg, dashboard: msg, weekly_plan: msg },
    weight:5,
    sourceSignals:[{ kind:'accuracyTrend', data:{ recent, netGain, deltas } }]
  }];
}

// --- Rule: Exam Mix (only one exam type recently) ---
function ruleExamMix(ctx){
  const { attempts } = ctx;
  if(!attempts || attempts.length < 5) return [];
  const recent = attempts.slice(0,8); // look at up to 8 recent
  const types = new Set(recent.map(a=> a.examType).filter(Boolean));
  if(types.size > 1) return [];
  const onlyType = [...types][0];
  if(!onlyType) return [];
  // Encourage diversification (if only TYT, suggest an AYT for depth, else a TYT for breadth)
  const target = onlyType === 'TYT' ? 'AYT' : 'TYT';
  const msg = `Son ${recent.length} denemede sadece ${onlyType} çözdün. Haftaya en az 1 ${target} denemesi ekle.`;
  return [{
    type:'exam_mix', subject:null, topic:null,
    scopes:['exam_tracker','dashboard','weekly_plan'],
    messages:{ default: msg, exam_tracker: msg, dashboard: msg, weekly_plan: msg },
    weight:4,
    sourceSignals:[{ kind:'examTypeDiversity', data:{ counts: recent.reduce((acc,a)=>{ acc[a.examType||'unknown']=(acc[a.examType||'unknown']||0)+1; return acc; },{}) } }]
  }];
}

const RULES = [ruleMissingSubject, ruleImbalance, ruleWeakTopics, ruleNoRecentExam, ruleStagnatingAccuracy, ruleExamMix];

async function generateSuggestionsForUser(userId){
  // fetch latest (current week) plan once & recent exam attempts
  const [plan, attempts] = await Promise.all([
    WeeklyPlan.findOne({ userId }).sort({ weekStartDate:-1 }),
    ExamAttempt.find({ userId }).sort({ date:-1 }).limit(12)
  ]);
  const lastExamDate = attempts[0]?.date;
  const ctx = { userId, plan, attempts, lastExamDate };
  const candidateLists = await Promise.all(RULES.map(r=> Promise.resolve(r(ctx)).catch(err=>{ console.warn('Rule error', r.name, err?.message); return []; })));
  const candidates = candidateLists.flat();
  const operations = [];
  for(const c of candidates){
    const key = dedupKey(userId, c.type, c.subject, c.topic);
    const existing = await AISuggestion.findOne({ userId, dedupKey:key });
  if(!existing){
      operations.push(AISuggestion.create({ ...c, userId, dedupKey:key, priority:c.weight, expiresAt: dayjs().add(7,'day').toDate() }));
    } else if(existing.status==='active') {
      existing.scopes = Array.from(new Set([...(existing.scopes||[]), ...(c.scopes||[])]));
      existing.messages = { ...existing.messages, ...c.messages };
      existing.weight = c.weight; existing.priority = c.weight;
      existing.sourceSignals = c.sourceSignals;
      operations.push(existing.save());
    }
  }
  await Promise.all(operations);
  return AISuggestion.find({ userId, status:'active' });
}

module.exports = { generateSuggestionsForUser };