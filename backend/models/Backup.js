const mongoose = require("mongoose");

const BackupSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["auto", "manual"],
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  dataTypes: {
    type: [String],
    required: true,
  },
  status: {
    type: String,
    enum: ["completed", "processing", "failed"],
    required: true,
  },
  downloadUrl: {
    type: String,
    required: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
    timestamps: true
  });

module.exports = mongoose.model("Backup", BackupSchema);
