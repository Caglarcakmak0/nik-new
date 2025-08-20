const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
  category: { type: String, enum: ['performance', 'coach', 'gamification', 'system'], required: true },
  type: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  body: { type: String, required: false, trim: true, maxlength: 1000 },
  actionUrl: { type: String, required: false, trim: true, maxlength: 300 },
  importance: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  icon: { type: String, required: false, trim: true, maxlength: 100 },
  readAt: { type: Date, default: null },
  dedupeKey: { type: String, required: false, index: true },
  meta: { type: Object, required: false },
}, { timestamps: true });

// Sık kullanılan sorgular için indeksler
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);


