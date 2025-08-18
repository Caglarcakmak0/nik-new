const mongoose = require("mongoose");

const CoachPerformanceSchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, unique: true },

    studentStats: {
      total: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      inactive: { type: Number, default: 0 },
    },

    feedbackStats: {
      totalFeedbacks: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      categoryAverages: {
        communication: { type: Number, default: 0 },
        programQuality: { type: Number, default: 0 },
        overallSatisfaction: { type: Number, default: 0 },
      },
      issuesCounts: {
        tooMuchPressure: { type: Number, default: 0 },
        notEnoughSupport: { type: Number, default: 0 },
        communicationProblems: { type: Number, default: 0 },
        programNotSuitable: { type: Number, default: 0 },
      },
      lastFeedbackDate: { type: Date },
    },

    lastUpdated: { type: Date, default: Date.now }, // özet hesaplandığı son an
  },
  { timestamps: true }
);

module.exports = mongoose.model("CoachPerformance", CoachPerformanceSchema);