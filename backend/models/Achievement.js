const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  points: { type: Number, required: true },
  category: { type: String, required: true },
  rarity: { type: String, required: true },
  unlockedAt: { type: Date, default: null },
}, {
    timestamps: true
  });

module.exports = mongoose.model('Achievement', achievementSchema);