const mongoose = require('mongoose');

// FLASHCARD MODEL
// Öğrencilerin konu bazlı soru-cevap (formül, tanım vb.) kartları
// Basit bir spaced-repetition alan seti ile (future-use) pratik istatistikleri tutulur.

const FlashcardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true
  },
  // Ders (isteğe bağlı) - mevcut subject enum'larını yeniden kullanmaya çalışıyoruz fakat zorunlu değil
  subject: {
    type: String,
    required: false,
    enum: [
      // TYT
      'matematik','geometri','turkce','tarih','cografya','felsefe','fizik','kimya','biyoloji',
      // AYT
      'matematik_ayt','fizik_ayt','kimya_ayt','biyoloji_ayt','edebiyat','tarih_ayt','cografya_ayt',
      // YDT
      'ingilizce','almanca','fransizca',
      // Diğer
      'genel_tekrar','deneme_sinavi','diger'
    ],
    default: undefined
  },
  // Konu: Kartların gruplanacağı asıl alan (örn: "Trigonometri", "İkinci Dereceden Denklemler")
  topic: { type: String, required: true, trim: true, maxlength: 100 },
  // Soru (ya da hatırlatma prompt'u)
  question: { type: String, required: true, trim: true, maxlength: 500 },
  // Cevap (formül, açıklama vs.)
  answer: { type: String, required: true, trim: true, maxlength: 2000 },
  // Etiketler (opsiyonel)
  tags: [{ type: String, trim: true, maxlength: 30 }],
  // İstatistikler (MVP basit sayaçlar) - future: spaced repetition scheduling
  stats: {
    timesShown: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },
    lastReviewedAt: { type: Date },
    nextReviewAt: { type: Date },
    difficulty: { type: Number, min: 1, max: 5, default: 3 } // 1=kolay 5=zor (kullanıcı güncelleyebilir)
  },
  // Aktif/Pasif
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Virtual success rate
FlashcardSchema.virtual('successRate').get(function() {
  if (!this.stats || this.stats.timesShown === 0) return 0;
  return Math.round((this.stats.timesCorrect / this.stats.timesShown) * 100);
});

FlashcardSchema.set('toJSON', { virtuals: true });
FlashcardSchema.set('toObject', { virtuals: true });

FlashcardSchema.index({ userId: 1, topic: 1 });
FlashcardSchema.index({ userId: 1, subject: 1 });
FlashcardSchema.index({ 'stats.nextReviewAt': 1 });

module.exports = mongoose.model('Flashcard', FlashcardSchema);
