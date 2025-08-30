const mongoose = require('mongoose');

const AISuggestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true, required: true },
  type: { type: String, required: true }, // missing_subject, imbalance, revision, etc.
  subject: { type: String },
  topic: { type: String },
  scopes: { type: [String], index: true, default: [] }, // e.g. ['weekly_plan','dashboard']
  messages: {
    default: { type: String, required: true },
    weekly_plan: { type: String },
    dashboard: { type: String },
    study_session: { type: String }
  },
  weight: { type: Number, default: 0 },
  priority: { type: Number, default: 0 },
  dedupKey: { type: String, index: true }, // userId+type+subject+topic hash
  sourceSignals: [{ kind: String, data: mongoose.Schema.Types.Mixed }],
  status: { type: String, enum: ['active','dismissed','consumed','stale'], default: 'active', index: true },
  dismissedScopes: { type: [String], default: [] },
  consumedAt: { type: Date },
  expiresAt: { type: Date, index: true }
},{ timestamps: true });

AISuggestionSchema.index({ userId:1, dedupKey:1 });

module.exports = mongoose.model('AISuggestion', AISuggestionSchema);