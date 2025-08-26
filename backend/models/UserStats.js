const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  totalXP: { type: Number, default: 0 },
  currentLevel: { type: Number, default: 1 },
  nextLevelXP: { type: Number, default: 250 }, // cumulative XP needed for next level (power curve)
  currentLevelXP: { type: Number, default: 0 }, // XP into current level
  streak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  lastActiveDate: { type: Date, default: null },
  totalAchievements: { type: Number, default: 0 },
  weeklyXP: { type: Number, default: 0 },
  monthlyXP: { type: Number, default: 0 },
  dailyChallenges: { type: Array, default: [] },
  levelingAlgorithmVersion: { type: Number, default: 1 }
});
userStatsSchema.index({ userId: 1 });
module.exports = mongoose.model('UserStats', userStatsSchema);