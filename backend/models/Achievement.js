const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  // Ownership
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },

  // Identity
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },

  // Legacy reward (still used by existing code) – XP verildiğinde eklenecek
  points: { type: Number, required: true },

  // Classification
  category: { type: String, required: true }, // e.g. study_time, questions, streak, duel
  rarity: { type: String, required: true, enum: ['common','rare','epic','legendary','mythic'] },

  // Progression meta (new fields)
  seriesKey: { type: String, default: '' }, // same logical chain (e.g. study_time_total)
  tier: { type: Number, default: 1 }, // 1..n inside a series
  progressType: { 
    type: String, 
    default: 'count', 
    enum: ['count','sumDuration','streak','avgEfficiency','examNet','questions','composite','hidden'] 
  },
  targetValue: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 }, // optional cache; can be recomputed

  // Flags
  hidden: { type: Boolean, default: false },
  seasonal: { type: Boolean, default: false },
  seasonId: { type: String, default: '' },

  // Unlock status
  unlockedAt: { type: Date, default: null },
  // Versioning (future balancing)
  version: { type: Number, default: 1 }
}, {
    timestamps: true
  });

// Helpful indexes
achievementSchema.index({ userId: 1, seriesKey: 1, tier: 1 });
achievementSchema.index({ userId: 1, category: 1 });
achievementSchema.index({ userId: 1, unlockedAt: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);