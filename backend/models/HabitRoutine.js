const mongoose = require('mongoose');

/**
 * HabitRoutine - Kullanıcının düzenli yapmak istediği saat bazlı alışkanlık tanımı
 * Streak, resistance ve gamification hesapları HabitLog işlemleri sırasında güncellenir.
 */
const HabitRoutineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  type: { 
    type: String, 
    enum: ['wake_up','start_study','deep_work','review','break','sleep','exercise','custom'],
    default: 'custom'
  },
  schedule: {
    recurrence: { type: String, enum: ['daily','weekdays','weekends','custom'], default: 'daily' },
    daysOfWeek: [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
    timeStart: { type: String, required: true, match: /^\d{2}:\d{2}$/ }, // HH:MM
    timeEnd: { type: String, match: /^\d{2}:\d{2}$/ },
    timezone: { type: String, default: 'Europe/Istanbul' }
  },
  behavior: {
    toleranceMinutes: { type: Number, default: 15, min: 0, max: 180 },
    autoCompleteByStudySession: { type: Boolean, default: true },
    minSessionMinutes: { type: Number, default: 10, min: 1, max: 600 },
    decayProtection: { type: Boolean, default: true } // bir kere streak kırılmasını affet
  },
  metrics: {
    targetConsistencyPercent: { type: Number, default: 80, min: 10, max: 100 },
    difficulty: { type: Number, default: 3, min: 1, max: 5 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    protectionUsed: { type: Boolean, default: false },
    lastLogDate: { type: Date }
  },
  gamification: {
    xpOnComplete: { type: Number, default: 0 },
    bonusThresholds: [{ streak: Number, xp: Number }],
    badgeKeys: [{ type: String }]
  },
  order: { type: Number, default: 0 },
  status: { type: String, enum: ['active','archived','paused'], default: 'active', index: true }
}, { timestamps: true });

HabitRoutineSchema.index({ userId: 1, status: 1 });
HabitRoutineSchema.index({ userId: 1, 'schedule.timeStart': 1 });

HabitRoutineSchema.methods.isPlannedForDate = function(date) {
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dow = dayNames[date.getDay()];
  const r = this.schedule.recurrence;
  if (r === 'daily') return true;
  if (r === 'weekdays') return ['Mon','Tue','Wed','Thu','Fri'].includes(dow);
  if (r === 'weekends') return ['Sat','Sun'].includes(dow);
  if (r === 'custom') return this.schedule.daysOfWeek?.includes(dow);
  return false;
};

module.exports = mongoose.model('HabitRoutine', HabitRoutineSchema);
