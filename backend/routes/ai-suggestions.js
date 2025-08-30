const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { checkRole } = require('../authRoles');
const AISuggestion = require('../models/AISuggestion');
const { generateSuggestionsForUser } = require('../services/aiSuggestionRules');
const WeeklyPlan = require('../models/WeeklyPlan');
const { getWeekStart } = require('../models/WeeklyPlan');

// In-memory rate limit state (non-cluster aware; acceptable for MVP)
const lastManualGenerate = new Map(); // userId -> ts
const lastAutoGenerate = new Map();   // userId -> ts

// GET /api/ai-suggestions?scope=weekly_plan
router.get('/', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId; const { scope } = req.query;
    const q = { userId, status:'active' };
    if(scope) {
      q.scopes = scope; // element match
      q.dismissedScopes = { $ne: scope }; // filter out dismissed for this scope
    }
    let list = await AISuggestion.find(q).sort({ priority:-1, updatedAt:-1 }).limit(50);
    // Auto-generate if empty (and rate-limited to every 5 min)
    if(list.length === 0){
      const now = Date.now();
      const last = lastAutoGenerate.get(userId) || 0;
      if(now - last > 5*60*1000){
        try {
          await generateSuggestionsForUser(userId);
          lastAutoGenerate.set(userId, now);
          list = await AISuggestion.find(q).sort({ priority:-1, updatedAt:-1 }).limit(50);
        } catch(genErr){ /* silent */ }
      }
    }
    res.json({ message:'Öneriler', data: list });
  } catch(e){ console.error('GET /ai-suggestions', e); res.status(500).json({ message:e.message }); }
});

// POST /api/ai-suggestions/generate (manual trigger)
router.post('/generate', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId;
    const isDev = process.env.NODE_ENV === 'development';
    const now = Date.now();
    const last = lastManualGenerate.get(userId) || 0;
    const limitSec = Number(process.env.AI_GEN_RATE_LIMIT_SECONDS || 60);
    if(!isDev){
      if(now - last < limitSec*1000){
        const remaining = limitSec - Math.floor((now - last)/1000);
        res.set('Retry-After', String(remaining));
        return res.status(429).json({ message:`Çok hızlı. ${remaining}s sonra tekrar deneyin.`, remainingSeconds: remaining });
      }
      lastManualGenerate.set(userId, now);
    }
    const out = await generateSuggestionsForUser(userId);
    res.json({ message:'Oluşturuldu', data: out, rateLimitSeconds: isDev?0:limitSec, devNoLimit: isDev });
  } catch(e){ console.error('POST /ai-suggestions/generate', e); res.status(500).json({ message:e.message }); }
});

// POST /api/ai-suggestions/:id/dismiss?scope=weekly_plan
router.post('/:id/dismiss', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId; const { id } = req.params; const { scope } = req.query;
    const doc = await AISuggestion.findOne({ _id:id, userId });
    if(!doc) return res.status(404).json({ message:'Bulunamadı' });
    if(scope){
      if(!doc.dismissedScopes.includes(scope)) doc.dismissedScopes.push(scope);
      if(doc.dismissedScopes.length === doc.scopes.length) doc.status='dismissed';
    } else {
      doc.status='dismissed';
    }
    await doc.save();
    res.json({ message:'Dismiss edildi', data: doc });
  } catch(e){ console.error('POST /ai-suggestions/:id/dismiss', e); res.status(500).json({ message:e.message }); }
});

// POST /api/ai-suggestions/:id/accept (opsiyonel weekly plana ekler)
router.post('/:id/accept', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId; const { id } = req.params; const { targetDay } = req.body || {};
    const sug = await AISuggestion.findOne({ _id:id, userId });
    if(!sug) return res.status(404).json({ message:'Öneri bulunamadı' });
    if(sug.status !== 'active') return res.status(400).json({ message:'Aktif değil' });
    let createdEntry = null;
    if(sug.scopes.includes('weekly_plan') && sug.subject){
      const ws = getWeekStart(new Date());
      const plan = await WeeklyPlan.getOrCreateByDate(userId, ws);
      const day = typeof targetDay === 'number' && targetDay>=0 && targetDay<=6 ? targetDay : 0;
      plan.entries.push({ day, subject: sug.subject, type:'konu_anlatim', customTitle: sug.topic || '', topic: sug.topic || '', notes:'', order: plan.entries.length });
      plan.rebuildSuggestions();
      await plan.save();
      createdEntry = plan.entries[plan.entries.length-1];
    }
    sug.status='consumed';
    sug.consumedAt = new Date();
    await sug.save();
    res.json({ message:'Öneri kabul edildi', data: { suggestion: sug, createdEntry } });
  } catch(e){ console.error('POST /ai-suggestions/:id/accept', e); res.status(500).json({ message:e.message }); }
});

module.exports = router;
