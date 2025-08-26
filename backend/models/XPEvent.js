const mongoose = require('mongoose');

const xpEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  type: { type: String, required: true }, // e.g. study_duration, questions, streak_bonus
  amount: { type: Number, required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: false },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

xpEventSchema.index({ userId: 1, createdAt: -1 });
xpEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('XPEvent', xpEventSchema);
