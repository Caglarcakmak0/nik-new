const mongoose = require("mongoose");

const CategoriesSchema = new mongoose.Schema(
  {
    communication: { type: Number, min: 1, max: 5, required: true },
    programQuality: { type: Number, min: 1, max: 5, required: true },
    overallSatisfaction: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false }
);

const SpecificIssuesSchema = new mongoose.Schema(
  {
    tooMuchPressure: { type: Boolean, default: false },
    notEnoughSupport: { type: Boolean, default: false },
    communicationProblems: { type: Boolean, default: false },
    programNotSuitable: { type: Boolean, default: false },
    other: { type: String, trim: true },
  },
  { _id: false }
);

const CoachFeedbackSchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },

    categories: { type: CategoriesSchema, required: true },
    overallRating: { type: Number }, // pre-save ile hesaplanır
    feedback: { type: String, required: true, trim: true },

    specificIssues: { type: SpecificIssuesSchema, default: {} },

    status: { type: String, enum: ["new", "read"], default: "new" },
    readBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    readAt: { type: Date },
  },
  { timestamps: true }
);


CoachFeedbackSchema.pre("save", function (next) {
  if (this.categories) {
    const { communication, programQuality, overallSatisfaction } = this.categories;
    const sum = (communication || 0) + (programQuality || 0) + (overallSatisfaction || 0);
    this.overallRating = Math.round((sum / 3) * 10) / 10;
  }
  next();
});

// Sorgu kalıpları için index
CoachFeedbackSchema.index({ coachId: 1, studentId: 1, createdAt: -1 });
CoachFeedbackSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("CoachFeedback", CoachFeedbackSchema);