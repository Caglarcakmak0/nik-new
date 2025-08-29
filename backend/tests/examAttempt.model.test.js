const mongoose = require('mongoose');
const ExamAttempt = require('../models/ExamAttempt');

describe('ExamAttempt model totals & accuracy', () => {
  beforeAll(async ()=> {
    await mongoose.connect(global.__MONGO_URI__);
  });
  afterAll(async ()=> { await mongoose.disconnect(); });

  test('net & accuracy computed on save', async () => {
    const userId = new mongoose.Types.ObjectId();
    const att = await ExamAttempt.create({ userId, source:'TYT Deneme 1', date:new Date(), subjects:[{ name:'Matematik', correct:20, wrong:5, blank:5 }], topics:[] });
    expect(att.totals.correct).toBe(20);
    expect(att.totals.wrong).toBe(5);
    expect(att.totals.net).toBeCloseTo(20 - 5/4);
    expect(att.totals.accuracy).toBeCloseTo(20/(20+5));
  });
});
