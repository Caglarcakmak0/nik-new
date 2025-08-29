const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Users = require('../models/Users');

let app, server;

describe('Habit Flow', () => {
  let user; let token;
  beforeAll(async () => {
    process.env.JWT_KEY = 'testsecret';
    process.env.MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/habit_test';
    const exported = require('../server');
    app = exported.app;
    // Use real connection (mongodb-memory-server global setup already provides MONGO_URL when using globalSetup, for simplicity rely on provided)
    await mongoose.connect(process.env.MONGO_URL);
    user = await Users.create({ email: 'test@example.com', password: 'hashed', role: 'student' });
    token = jwt.sign({ userId: user._id, tokenVersion: user.tokenVersion }, process.env.JWT_KEY);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('create routine -> mark done -> summary & risk', async () => {
    // create routine
    const routineRes = await request(app)
      .post('/api/habits/routines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sabah Erken Kalk',
        type: 'wake_up',
        schedule: { recurrence: 'daily', timeStart: '07:00' },
        metrics: { difficulty: 2 }
      });
    expect(routineRes.status).toBe(201);
    const habitId = routineRes.body.data._id;

    // mark done
    const markRes = await request(app)
      .post(`/api/habits/routines/${habitId}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'done' });
    expect(markRes.status).toBe(200);
    expect(markRes.body.data.status === 'done' || markRes.body.data.status === 'late').toBe(true);

    // summary
    const summaryRes = await request(app)
      .get('/api/habits/summary?days=3')
      .set('Authorization', `Bearer ${token}`);
    expect(summaryRes.status).toBe(200);
    const summary = summaryRes.body.data[habitId];
    expect(summary).toBeDefined();
    expect(summary.done + summary.late + summary.auto).toBeGreaterThanOrEqual(1);

    // risk (from analytics route)
    const riskRes = await request(app)
      .get('/api/habit-analytics/risk')
      .set('Authorization', `Bearer ${token}`);
    expect(riskRes.status).toBe(200);
    expect(Array.isArray(riskRes.body.data)).toBe(true);
    const found = riskRes.body.data.find(r=> r.habitId === habitId);
    expect(found).toBeDefined();
  });
});