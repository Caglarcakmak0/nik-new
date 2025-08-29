const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { checkRole } = require('../authRoles');
const WeeklyPlan = require('../models/WeeklyPlan');
const { getWeekStart } = require('../models/WeeklyPlan');

// Helper map for UI day names (TR)
const DAY_LABELS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

// GET /api/weekly-plans?date=2025-08-30 -> ilgili haftanın programı
router.get('/', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId;
    const { date } = req.query;
    const baseDate = date ? new Date(date) : new Date();
    const weekStart = getWeekStart(baseDate);
    const plan = await WeeklyPlan.findOne({ userId, weekStartDate: weekStart });
    if(!plan){
      return res.json({ message: 'Haftalık program bulunamadı', data: null });
    }
    res.json({ message: 'Haftalık program getirildi', data: plan });
  } catch(e){
    console.error('GET /weekly-plans error', e); res.status(500).json({ message: e.message });
  }
});

// POST /api/weekly-plans (ilk kez oluştur veya overwrite)
// Body: { weekStartDate?, entries: [{ day, subject, type, topic, customTitle, notes }] }
router.post('/', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId;
    const { weekStartDate, entries, title } = req.body;
    const weekStart = getWeekStart(weekStartDate || new Date());
    let plan = await WeeklyPlan.findOne({ userId, weekStartDate: weekStart });
    if(!plan){
      plan = new WeeklyPlan({ userId, weekStartDate: weekStart, entries: [] });
    }
    if (Array.isArray(entries)) {
      plan.entries = entries.map((e,i)=>({ ...e, order: e.order ?? i }));
    }
    if (title) plan.title = title;
    plan.rebuildSuggestions();
    await plan.save();
    res.status(201).json({ message: 'Haftalık program kaydedildi', data: plan });
  } catch(e){
    console.error('POST /weekly-plans error', e); res.status(500).json({ message: e.message });
  }
});

// PATCH - Tek entry ekle
router.patch('/:weekStartDate/add-entry', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
  const userId = req.user?.userId; const { weekStartDate } = req.params; const { day, subject, type, topic, customTitle, notes, suggestion, suggestionLocked } = req.body;
  console.log('[weekly-plans] add-entry body', { day, subject, type, topic, customTitle, notes });
    const ws = getWeekStart(weekStartDate);
    let plan = await WeeklyPlan.findOne({ userId, weekStartDate: ws });
    if(!plan) plan = new WeeklyPlan({ userId, weekStartDate: ws, entries: [] });
  const entry = { day, subject, type, topic: topic || '', customTitle: customTitle || '', notes: notes || '', order: plan.entries.length };
    if (suggestion) entry.suggestion = suggestion;
    if (suggestionLocked !== undefined) entry.suggestionLocked = suggestionLocked;
    plan.entries.push(entry);
    plan.rebuildSuggestions();
    await plan.save();
    res.json({ message: 'Ders eklendi', data: plan });
  } catch(e){ console.error('PATCH /weekly-plans add-entry error', e); res.status(500).json({ message: e.message }); }
});

// PATCH - Entry güncelle
router.patch('/:weekStartDate/entries/:entryId', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
  const userId = req.user?.userId; const { weekStartDate, entryId } = req.params; const raw = req.body || {};
  console.log('[weekly-plans] update-entry body', entryId, raw);
    const ws = getWeekStart(weekStartDate);
    const plan = await WeeklyPlan.findOne({ userId, weekStartDate: ws });
    if(!plan) return res.status(404).json({ message: 'Plan bulunamadı' });
  const entry = plan.entries.id(entryId);
  if(!entry) return res.status(404).json({ message: 'Entry bulunamadı' });
  // Sadece izin verilen alanları güncelle (boş stringler dahil)
  const allow = ['day','subject','type','topic','customTitle','notes','status','suggestionLocked'];
  allow.forEach(k=> { if(raw[k] !== undefined) entry[k] = raw[k]; });
  if(raw.suggestionLocked === false){ // kilit açılırsa yeniden üret
      entry.suggestionLocked = false;
    }
    plan.rebuildSuggestions();
    await plan.save();
    res.json({ message: 'Entry güncellendi', data: plan });
  } catch(e){ console.error('PATCH /weekly-plans entry update error', e); res.status(500).json({ message: e.message }); }
});

// PATCH - Entry tamamlandı işaretle
router.patch('/:weekStartDate/entries/:entryId/toggle-status', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId; const { weekStartDate, entryId } = req.params; const { status } = req.body;
    const ws = getWeekStart(weekStartDate);
    const plan = await WeeklyPlan.findOne({ userId, weekStartDate: ws });
    if(!plan) return res.status(404).json({ message: 'Plan bulunamadı' });
    const entry = plan.entries.id(entryId);
    if(!entry) return res.status(404).json({ message: 'Entry bulunamadı' });
    entry.status = status || (entry.status === 'completed' ? 'not_started' : 'completed');
    await plan.save();
    res.json({ message: 'Durum güncellendi', data: plan });
  } catch(e){ console.error('PATCH /weekly-plans toggle error', e); res.status(500).json({ message: e.message }); }
});

// PATCH - Bir gün içindeki entry sırasını güncelle
// Body: { day: 0-6, orderedEntryIds: [id1,id2,...] }
router.patch('/:weekStartDate/reorder', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId; const { weekStartDate } = req.params; const { day, orderedEntryIds } = req.body;
    if(day === undefined || !Array.isArray(orderedEntryIds)) return res.status(400).json({ message: 'day ve orderedEntryIds gerekli' });
    const ws = getWeekStart(weekStartDate);
    const plan = await WeeklyPlan.findOne({ userId, weekStartDate: ws });
    if(!plan) return res.status(404).json({ message: 'Plan bulunamadı' });
    // Map for quick access
    const idSet = new Set(orderedEntryIds);
    // İlgili günün entry'lerini filtrele
    const dayEntries = plan.entries.filter(e=> e.day === day);
    if(dayEntries.length !== orderedEntryIds.length) {
      return res.status(400).json({ message: 'Sıra listesi ile gün içindeki entry sayısı uyuşmuyor' });
    }
    // Validate all ids exist
    for(const id of orderedEntryIds){
      if(!dayEntries.find(e=> String(e._id) === String(id))) return res.status(400).json({ message: 'Geçersiz entryId: '+id });
    }
    // Apply order values
    orderedEntryIds.forEach((id, idx)=>{
      const entry = plan.entries.id(id); if(entry) entry.order = idx;
    });
    await plan.save();
    res.json({ message: 'Sıra güncellendi', data: plan });
  } catch(e){ console.error('PATCH /weekly-plans reorder error', e); res.status(500).json({ message: e.message }); }
});

// DELETE - Entry sil
router.delete('/:weekStartDate/entries/:entryId', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId; const { weekStartDate, entryId } = req.params;
    const ws = getWeekStart(weekStartDate);
    const plan = await WeeklyPlan.findOne({ userId, weekStartDate: ws });
    if(!plan) return res.status(404).json({ message: 'Plan bulunamadı' });
  const entry = plan.entries.id(entryId);
  if(!entry) return res.status(404).json({ message: 'Entry bulunamadı' });
  // Mongoose 7+: remove() kaldırıldı; pull ile sil
  plan.entries.pull(entryId);
    await plan.save();
    res.json({ message: 'Entry silindi', data: plan });
  } catch(e){ console.error('DELETE /weekly-plans entry error', e); res.status(500).json({ message: e.message }); }
});

// GET - Belirli gün detay popup verisi
// /api/weekly-plans/day-detail?date=2025-08-30&day=1
router.get('/day-detail', authenticateToken, checkRole('student'), async (req,res)=>{
  try {
    const userId = req.user?.userId; const { date, day } = req.query; // day opsiyonel; date bazlı hesaplanabilir
    const baseDate = date ? new Date(date) : new Date();
    const ws = getWeekStart(baseDate);
    // Hangi gün: Eğer day paramı yoksa baseDate'in haftadaki indexi
    let dayIndex;
    if (day !== undefined) dayIndex = parseInt(day,10); else {
      const jsDay = baseDate.getDay(); // 0 pazar
      dayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0 pazartesi ... 6 pazar mapping'i
    }
    const plan = await WeeklyPlan.findOne({ userId, weekStartDate: ws });
    if(!plan) return res.status(404).json({ message: 'Plan bulunamadı' });
    const entries = plan.entries.filter(e=> e.day === dayIndex).sort((a,b)=> a.order - b.order);
    res.json({ message: 'Gün detayları', data: { day: dayIndex, dayLabel: DAY_LABELS[dayIndex], entries } });
  } catch(e){ console.error('GET /weekly-plans/day-detail error', e); res.status(500).json({ message: e.message }); }
});

module.exports = router;