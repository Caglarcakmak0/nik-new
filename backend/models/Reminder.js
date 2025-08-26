const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
  date: { type: Date, required: true, index: true }, // Gün bazlı (saat önemsenmez)
  text: { type: String, required: true, trim: true, maxlength: 300 },
  subject: { type: String, required: false, trim: true, maxlength: 50 },
  isDone: { type: Boolean, default: false },
  meta: { type: Object, required: false }
}, { timestamps: true });

// Aynı gün aynı metni tekrar etmesin diye opsiyonel uniq (metin çok kısa değilse)
ReminderSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Reminder', ReminderSchema);
