const mongoose = require('mongoose');

// Öğrenci ders bazlı YouTube playlist tercihi
// Her ders için tek aktif kayıt varsayımı ile (studentId+subject+isActive index)
const StudentSubjectPreferenceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }, // kaydı oluşturan koç
  subject: { 
    type: String, required: true, enum: [
      'matematik','geometri','turkce','tarih','cografya','felsefe','fizik','kimya','biyoloji',
      'matematik_ayt','fizik_ayt','kimya_ayt','biyoloji_ayt','edebiyat','tarih_ayt','cografya_ayt',
      'ingilizce','almanca','fransizca','genel_tekrar','deneme_sinavi','diger'
    ]
  },
  teacherName: { type: String, trim: true },
  playlistId: { type: String, required: true, trim: true },
  playlistTitle: { type: String, trim: true },
  channelId: { type: String, trim: true },
  channelTitle: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  notes: { type: String, maxlength: 500, trim: true }
}, { timestamps: true });

StudentSubjectPreferenceSchema.index({ studentId: 1, subject: 1, isActive: 1 });
StudentSubjectPreferenceSchema.index({ playlistId: 1 });

module.exports = mongoose.model('StudentSubjectPreference', StudentSubjectPreferenceSchema);
