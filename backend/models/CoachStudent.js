const mongoose = require("mongoose");

const CoachStudentSchema = new mongoose.Schema(
  {
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    assignedAt: { type: Date, default: Date.now },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" }, // Admin
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Sık sorgular için index
CoachStudentSchema.index({ coachId: 1, status: 1 });
CoachStudentSchema.index({ studentId: 1, status: 1 });

// Aynı koç-öğrenci çifti için tek ACTIVE kayıt (inactive serbest)
CoachStudentSchema.index(
  { coachId: 1, studentId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

module.exports = mongoose.model("CoachStudent", CoachStudentSchema);