const mongoose = require('mongoose');

const DuelSchema = new mongoose.Schema({
    challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    opponent: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    period: { type: String, enum: ['daily', 'weekly'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'active', 'declined', 'cancelled', 'completed'], default: 'pending' },
    results: {
        challengerStudyTimeMin: { type: Number, default: 0 },
        opponentStudyTimeMin: { type: Number, default: 0 },
        winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: false },
        completedAt: { type: Date, required: false }
    }
}, { timestamps: true });

// Indexes for quick lookup
DuelSchema.index({ challenger: 1, opponent: 1, period: 1, startDate: 1, endDate: 1 });
DuelSchema.index({ challenger: 1, status: 1 });
DuelSchema.index({ opponent: 1, status: 1 });

module.exports = mongoose.model('Duel', DuelSchema);

