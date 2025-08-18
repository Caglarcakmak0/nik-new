const mongoose = require('mongoose');

const topicMatrixSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: [
      'turkce', 'tarih', 'cografya', 'felsefe', 'din_kultur',
      'matematik', 'geometri', 'fizik', 'kimya', 'biyoloji',
      'edebiyat', 'tarih_ayt', 'cografya_ayt', 'felsefe_ayt',
      'din_kultur_ayt', 'matematik_ayt', 'fizik_ayt', 'kimya_ayt',
      'biyoloji_ayt', 'ingilizce', 'almanca', 'fransizca', 'diger'
    ]
  },
  dayCount: {
    type: Number,
    required: true,
    min: 1,
    max: 60,
    default: 30
  },
  topics: [{
    type: String,
    required: true
  }],
  cellColors: {
    type: Map,
    of: String,
    default: new Map()
  },
  columnColors: {
    type: Map,
    of: String,
    default: new Map()
  },
  topicColors: {
    type: Map,
    of: String,
    default: new Map()
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one matrix per user per subject
topicMatrixSchema.index({ userId: 1, subject: 1 }, { unique: true });

// Index for queries by creator (coach)
topicMatrixSchema.index({ createdBy: 1, subject: 1 });

const TopicMatrix = mongoose.model('TopicMatrix', topicMatrixSchema);

module.exports = TopicMatrix;