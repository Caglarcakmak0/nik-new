const mongoose = require('mongoose');

const userDailyChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  dateKey: { type: String, required: true }, // YYYY-MM-DD (UTC)
  challenges: [{
    key: { type: String, required: true },
    title: String,
    description: String,
    target: Number,
    current: { type: Number, default: 0 },
    xpReward: Number,
    category: String,
    isCompleted: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now }
});

userDailyChallengeSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('UserDailyChallenge', userDailyChallengeSchema);
