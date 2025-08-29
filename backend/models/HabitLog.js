const mongoose = require('mongoose');

/**
 * HabitLog - Belirli bir gün için alışkanlık gerçekleştirme kaydı
 */
const HabitLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
  habitRoutineId: { type: mongoose.Schema.Types.ObjectId, ref: 'HabitRoutine', required: true, index: true },
  date: { type: Date, required: true, index: true }, // Gün 00:00 UTC
  status: { 
    type: String, 
    enum: ['pending','done','late','missed','skipped','auto'], 
    default: 'pending' 
  },
  completedAt: { type: Date },
  latenessMinutes: { type: Number, default: 0, min: 0 },
  resistanceScoreSnapshot: { type: Number, default: 0 },
  streakAfter: { type: Number, default: 0 },
  autoCaptured: { type: Boolean, default: false },
  source: { type: String, enum: ['user','system','session_hook'], default: 'user' }
}, { timestamps: true });

HabitLogSchema.index({ userId: 1, habitRoutineId: 1, date: 1 }, { unique: true });
// Optimize range queries by user+date
HabitLogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('HabitLog', HabitLogSchema);
