const mongoose = require('mongoose');
const competitionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['weekly', 'monthly', 'special'], required: true },
  category: { type: String, enum: ['questions', 'time', 'streak', 'mixed'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  maxParticipants: { type: Number, default: null },
  prizes: [{
    name: { type: String, required: true },
    description: { type: String },
    value: { type: String }
  }],
  rules: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isJoined: { type: Boolean, default: false },
  status: { type: String, enum: ['upcoming', 'active', 'ended'], default: 'upcoming' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  createdAt: { type: Date, default: Date.now },
  leaderboard: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    score: { type: Number, default: 0 },
    rank: { type: Number }
  }]
});
module.exports = mongoose.model('Competition', competitionSchema);