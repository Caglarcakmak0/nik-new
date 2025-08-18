const mongoose = require("mongoose");

const StudyProgramSchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },

    startDate: { type: Date },
    endDate: { type: Date },

    // Günlük plan referansları
    dailyPlanIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "DailyPlan" }],

    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  },
  { timestamps: true }
);

// Sorgu kalıpları
StudyProgramSchema.index({ coachId: 1, studentId: 1, status: 1 });
StudyProgramSchema.index({ studentId: 1, status: 1, startDate: -1 });

module.exports = mongoose.model("StudyProgram", StudyProgramSchema);