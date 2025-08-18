const mongoose = require('mongoose');

const MotivationSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true, maxlength: 500 },
    author: { type: String, required: false, trim: true, maxlength: 100 },
    year: { type: Number, required: true },
    weekOfYear: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: false },
}, { timestamps: true });

// Aynı yıl + hafta için tek kayıt
MotivationSchema.index({ year: 1, weekOfYear: 1 }, { unique: true });

const Motivation = mongoose.model('Motivation', MotivationSchema);
module.exports = Motivation;


