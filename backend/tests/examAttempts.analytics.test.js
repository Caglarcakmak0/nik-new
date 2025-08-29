const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const ExamAttempt = require('../models/ExamAttempt');
let app;

// Create an express app instance similar to server but without listen
beforeAll(async () => {
  process.env.JWT_KEY = process.env.JWT_KEY || 'testsecret';
  const express = require('express');
  const mainRoute = require('../routes/index');
  app = express();
  app.use(express.json());
  app.use('/api', mainRoute);
  await mongoose.connect(global.__MONGO_URI__ || 'mongodb://localhost:27017/examtracker_test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

function authHeader(userId){
  const token = jwt.sign({ userId, tokenVersion:0 }, process.env.JWT_KEY);
  return `Bearer ${token}`;
}

describe('ExamAttempts analytics', () => {
  let userId;
  beforeEach(async () => {
    await ExamAttempt.deleteMany({});
    userId = new mongoose.Types.ObjectId();
  });

  test('CRUD + overview + topic + aggregate', async () => {
    // create attempt
    const createRes = await request(app).post('/api/exam-attempts')
      .set('Authorization', authHeader(userId))
      .send({ source:'TYT Deneme 1', date:new Date().toISOString(), subjects:[{ name:'Matematik', correct:20, wrong:5, blank:5 }], topics:[{ subject:'Matematik', topic:'Problemler', wrong:3, asked:6 }] });
    expect(createRes.status).toBe(201);
    const id = createRes.body.data.id;

    // list
    const listRes = await request(app).get('/api/exam-attempts').set('Authorization', authHeader(userId));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);

    // overview
    const ov = await request(app).get('/api/exam-attempts/stats/overview').set('Authorization', authHeader(userId));
    expect(ov.status).toBe(200);
    expect(ov.body.data.count).toBe(1);

    // frequent topics
    const freq = await request(app).get('/api/exam-attempts/analytics/frequent-topics?limit=5').set('Authorization', authHeader(userId));
    expect(freq.status).toBe(200);
    expect(Array.isArray(freq.body.data)).toBe(true);

    // topic history
    const th = await request(app).get('/api/exam-attempts/analytics/topic-history?topic=Problemler&range=30d').set('Authorization', authHeader(userId));
    expect(th.status).toBe(200);

    // aggregate history
    const ag = await request(app).get('/api/exam-attempts/analytics/aggregate-history?type=TYT&bucket=day&range=30d').set('Authorization', authHeader(userId));
    expect(ag.status).toBe(200);

    // update
    const upd = await request(app).put(`/api/exam-attempts/${id}`).set('Authorization', authHeader(userId)).send({ source:'TYT Deneme 1 Guncel' });
    expect(upd.status).toBe(200);

    // delete
    const del = await request(app).delete(`/api/exam-attempts/${id}`).set('Authorization', authHeader(userId));
    expect(del.status).toBe(200);
  });
});
