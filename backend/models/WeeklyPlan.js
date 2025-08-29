const mongoose = require('mongoose');

// Yardımcı: Hafta başlangıcını (Pazartesi) hesapla
function getWeekStart(dateInput) {
  const d = new Date(dateInput);
  d.setHours(0,0,0,0);
  // JS: 0 Pazar, 1 Pazartesi ...; Pazartesi baz almak için
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Pazar ise -6, diğer günlerde 1-day
  d.setDate(d.getDate() + diff);
  return d;
}

// Subject kod -> Görsel isim eşlemesi (DailyPlan ile tutarlı olacak şekilde genişletilebilir)
const SUBJECT_DISPLAY_MAP = {
  matematik: 'TYT Matematik',
  geometri: 'Geometri',
  turkce: 'Türkçe',
  tarih: 'Tarih',
  cografya: 'Coğrafya',
  felsefe: 'Felsefe',
  fizik: 'Fizik',
  kimya: 'Kimya',
  biyoloji: 'Biyoloji',
  matematik_ayt: 'AYT Matematik',
  fizik_ayt: 'AYT Fizik',
  kimya_ayt: 'AYT Kimya',
  biyoloji_ayt: 'AYT Biyoloji',
  edebiyat: 'Edebiyat',
  tarih_ayt: 'AYT Tarih',
  cografya_ayt: 'AYT Coğrafya',
  ingilizce: 'İngilizce',
  almanca: 'Almanca',
  fransizca: 'Fransızca',
  genel_tekrar: 'Genel Tekrar',
  deneme_sinavi: 'Deneme Sınavı',
  diger: 'Diğer'
};

// Otomatik öneri üretimi
function buildSuggestion(entry) {
  const subjectLabel = SUBJECT_DISPLAY_MAP[entry.subject] || entry.subject;
  const topicText = entry.topic ? `${entry.topic}` : 'seçtiğin konudan';
  if (entry.type === 'konu_anlatim') {
    return `${subjectLabel} – ${topicText} video çalış`;
  } else if (entry.type === 'soru_cozum') {
    return `${subjectLabel} – ${topicText} soru çöz`;
  }
  return `${subjectLabel}`;
}

const WeeklyEntrySchema = new mongoose.Schema({
  day: { // 0=Monday, 6=Sunday (hafta içi 0-6)
    type: Number,
    min: 0,
    max: 6,
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: [
      'matematik','geometri','turkce','tarih','cografya','felsefe','fizik','kimya','biyoloji',
      'matematik_ayt','fizik_ayt','kimya_ayt','biyoloji_ayt','edebiyat','tarih_ayt','cografya_ayt',
      'ingilizce','almanca','fransizca','genel_tekrar','deneme_sinavi','diger'
    ]
  },
  type: { // Konu anlatım mı soru çözüm mü
    type: String,
    enum: ['konu_anlatim','soru_cozum'],
    required: true
  },
  topic: { type: String, trim: true, maxlength: 80, default: '' },
  customTitle: { type: String, trim: true, maxlength: 120, default: '' }, // UI'de gösterilecek özel başlık opsiyonel
  suggestion: { type: String, trim: true }, // sistem önerisi (otomatik)
  status: { type: String, enum: ['not_started','in_progress','completed'], default: 'not_started' },
  order: { type: Number, min: 0, default: 0 },
  notes: { type: String, trim: true, maxlength: 300, default: '' },
  // Öğrenci isterse öneriyi elle override edebilir
  suggestionLocked: { type: Boolean, default: false }
},{ timestamps: true });

// Öneri otomatik doldurma (pre-validate her entry için)
WeeklyEntrySchema.pre('validate', function(next){
  if (!this.suggestionLocked) {
    this.suggestion = buildSuggestion(this);
  }
  next();
});

const WeeklyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  weekStartDate: { type: Date, required: true }, // Pazartesi
  entries: [WeeklyEntrySchema],
  title: { type: String, trim: true, default: function(){
    const d = new Date(this.weekStartDate); return `Haftalık Program (${d.toLocaleDateString('tr-TR')})`;
  }},
  customization: { // İleride: renkler, görünüm vb.
    colorTheme: { type: String, default: 'default' }
  },
  source: { type: String, enum: ['self','ai_generated'], default: 'self' }
},{ timestamps: true });

WeeklyPlanSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });

// Statics
WeeklyPlanSchema.statics.getOrCreateByDate = async function(userId, anyDate){
  const ws = getWeekStart(anyDate);
  let plan = await this.findOne({ userId, weekStartDate: ws });
  if (!plan) {
    plan = await this.create({ userId, weekStartDate: ws, entries: [] });
  }
  return plan;
};

WeeklyPlanSchema.methods.rebuildSuggestions = function(){
  this.entries.forEach(e=>{ if(!e.suggestionLocked){ e.suggestion = buildSuggestion(e); } });
};

module.exports = mongoose.model('WeeklyPlan', WeeklyPlanSchema);
module.exports.getWeekStart = getWeekStart;