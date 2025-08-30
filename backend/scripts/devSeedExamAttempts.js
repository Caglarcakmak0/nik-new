/* Seed sample exam attempts for a dev student to exercise AI suggestion rules. */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Users = require('../models/Users');
const ExamAttempt = require('../models/ExamAttempt');

async function main(){
  const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/yks-portal';
  await mongoose.connect(mongoUrl);
  console.log('Connected Mongo');

  const student = await Users.findOne({ email:'student@nik.dev' });
  if(!student){
    console.error('Dev student (student@nik.dev) not found. Run scripts/devSeedUsers.js first.');
    process.exit(1);
  }

  // Clear previous sample attempts (optional comment out if you want to accumulate)
  const existing = await ExamAttempt.find({ userId: student._id });
  if(existing.length){
    await ExamAttempt.deleteMany({ userId: student._id });
    console.log('Cleared previous attempts:', existing.length);
  }

  const now = new Date();
  function d(daysAgo){ const dt=new Date(now.getTime()-daysAgo*86400000); dt.setHours(10,0,0,0); return dt; }

  const attempts = [
    // Older: shows gap for some subjects (no fizik / kimya recently to trigger missing_subject)
    { source:'TYT 11', date:d(18), examType:'TYT', subjects:[
      { name:'matematik', correct:22, wrong:8, blank:10 },
      { name:'turkce', correct:28, wrong:7, blank:5 },
      { name:'biyoloji', correct:7, wrong:5, blank:3 }
    ], topics:[ { subject:'matematik', topic:'Limit', wrong:3, asked:6 }, { subject:'matematik', topic:'Türev', wrong:2, asked:5 } ] },
    { source:'TYT 12', date:d(12), examType:'TYT', subjects:[
      { name:'matematik', correct:24, wrong:6, blank:10 },
      { name:'turkce', correct:30, wrong:5, blank:5 },
      { name:'biyoloji', correct:10, wrong:4, blank:1 }
    ], topics:[ { subject:'matematik', topic:'Limit', wrong:2, asked:5 }, { subject:'matematik', topic:'Türev', wrong:3, asked:6 }, { subject:'turkce', topic:'Paragraf', wrong:4, asked:20 } ] },
    { source:'TYT 13', date:d(9), examType:'TYT', subjects:[
      { name:'matematik', correct:23, wrong:7, blank:10 },
      { name:'turkce', correct:29, wrong:6, blank:5 },
      { name:'biyoloji', correct:9, wrong:5, blank:1 }
    ], topics:[ { subject:'matematik', topic:'Limit', wrong:3, asked:6 }, { subject:'matematik', topic:'Türev', wrong:4, asked:7 }, { subject:'turkce', topic:'Paragraf', wrong:3, asked:18 } ] },
    // Recent gap (last 6 days no exam)
  ];

  await ExamAttempt.insertMany(attempts.map(a=> ({ ...a, userId: student._id })));
  console.log('Inserted attempts:', attempts.length);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e=> { console.error(e); process.exit(1); });
