const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const Users = require('../models/Users');
const HabitRoutine = require('../models/HabitRoutine');
const HabitLog = require('../models/HabitLog');
const { ensureDailyInit, ensureCloseDay } = require('../jobs/habitJobs');

let app;

describe('Habit decayProtection', () => {
  let user; let token; let routine;
  beforeAll(async () => {
    process.env.JWT_KEY = 'testsecret';
    // globalSetup already created in-memory server; reuse uri
    if(!process.env.MONGO_URL) throw new Error('MONGO_URL missing in test env');
    const exported = require('../server');
    app = exported.app;
    await mongoose.connect(process.env.MONGO_URL);
    user = await Users.create({ email:'decay@example.com', password:'x', role:'student' });
    token = jwt.sign({ userId: user._id, tokenVersion: user.tokenVersion }, process.env.JWT_KEY);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('streak forgiven first miss with decayProtection', async () => {
    // Create routine
    const res = await request(app)
      .post('/api/habits/routines')
      .set('Authorization', `Bearer ${token}`)
      .send({ name:'Test Habit', schedule:{ recurrence:'daily', timeStart:'06:30' }, behavior:{ decayProtection:true }, metrics:{ difficulty:2 } });
    expect(res.status).toBe(201);
    routine = res.body.data;

    // Simulate two consecutive days: day0 complete, day1 missed -> streak should stay due to protection
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const day0 = new Date(today); day0.setUTCDate(day0.getUTCDate()-2); // day -2
    const day1 = new Date(today); day1.setUTCDate(day1.getUTCDate()-1); // day -1

    // Insert logs manually for control
    await HabitLog.create({ userId: user._id, habitRoutineId: routine._id, date: day0, status:'done', streakAfter:1 });
    // Update routine streak to 1
    await HabitRoutine.updateOne({ _id: routine._id }, { $set: { 'metrics.currentStreak':1, 'metrics.longestStreak':1 } });

    // Run closeDay for day1 (simulate missed) -> create pending first then close
    await HabitLog.create({ userId: user._id, habitRoutineId: routine._id, date: day1, status:'pending' });
    await ensureCloseDay(new Date(Date.UTC(day1.getUTCFullYear(), day1.getUTCMonth(), day1.getUTCDate(), 23, 0, 0)));

    const updated = await HabitRoutine.findById(routine._id).lean();
    expect(updated.metrics.currentStreak).toBe(1); // forgiven
    expect(updated.metrics.protectionUsed).toBe(true);
  });

  test('second miss resets streak after protection used', async () => {
    const habit = await HabitRoutine.findById(routine._id);
    // simulate another missed day
    const day2 = new Date(); day2.setUTCHours(0,0,0,0); day2.setUTCDate(day2.getUTCDate()-0); // today
    await HabitLog.create({ userId: user._id, habitRoutineId: habit._id, date: day2, status:'pending' });
    await ensureCloseDay(new Date(Date.UTC(day2.getUTCFullYear(), day2.getUTCMonth(), day2.getUTCDate(), 23, 0, 0)));
    const updated = await HabitRoutine.findById(habit._id).lean();
    expect(updated.metrics.currentStreak).toBe(0); // reset after protection consumed
  });
});
