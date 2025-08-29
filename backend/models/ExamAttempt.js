const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  correct: { type: Number, required: true, min: 0 },
  wrong: { type: Number, required: true, min: 0 },
  blank: { type: Number, required: true, min: 0 }
},{ _id:false });

const topicSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  wrong: { type: Number, required: true, min: 0 },
  asked: { type: Number, min:0 }
},{ _id:false });

const examAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
  source: { type: String, required: true }, // e.g. "TYT 15"
  examType: { type: String, enum: ['TYT','AYT'], index: true },
  date: { type: Date, required: true, index: true },
  subjects: { type: [subjectSchema], validate: v => v.length > 0 },
  topics: { type: [topicSchema], default: [] },
  totals: {
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    blank: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }
  }
},{ timestamps: true });

examAttemptSchema.index({ userId:1, date:-1 });
examAttemptSchema.index({ userId:1, examType:1, date:-1 });
examAttemptSchema.index({ userId:1, 'subjects.name':1 });
examAttemptSchema.index({ userId:1, 'topics.topic':1 });

examAttemptSchema.pre('save', function(next){
  if (this.isModified('subjects')) {
    const sums = this.subjects.reduce((acc,s)=>{ acc.correct+=s.correct; acc.wrong+=s.wrong; acc.blank+=s.blank; return acc; }, {correct:0,wrong:0,blank:0});
    const answered = sums.correct + sums.wrong;
    this.totals.correct = sums.correct;
    this.totals.wrong = sums.wrong;
    this.totals.blank = sums.blank;
    this.totals.net = sums.correct - sums.wrong/4;
    this.totals.accuracy = answered ? (sums.correct/answered) : 0;
  }
  if (!this.examType) {
    const upper = (this.source||'').toUpperCase();
    if (upper.includes('TYT')) this.examType = 'TYT';
    else if (upper.includes('AYT')) this.examType = 'AYT';
  }
  next();
});

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
