const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  totalXP: { type: Number, default: 0 },
  currentLevel: { type: Number, default: 1 },
  nextLevelXP: { type: Number, default: 100 },
  currentLevelXP: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  totalAchievements: { type: Number, default: 0 },
  weeklyXP: { type: Number, default: 0 },
  monthlyXP: { type: Number, default: 0 },
  dailyChallenges: { type: Array, default: [] },
});
module.exports = mongoose.model('UserStats', userStatsSchema);