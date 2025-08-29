const mongoose = require('mongoose');
const Users = require('../models/Users');
const HabitRoutine = require('../models/HabitRoutine');
const HabitLog = require('../models/HabitLog');
const { computeRiskForUser, computeHeatmapForUser } = require('../services/habitAnalyticsService');

describe('Habit analytics service', () => {
  let user;
  beforeAll(async () => {
    if(!process.env.MONGO_URL) throw new Error('MONGO_URL missing');
    await mongoose.connect(process.env.MONGO_URL);
    user = await Users.create({ email:'analytics@example.com', password:'x', role:'student' });
  });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  test('risk & heatmap basic signals', async () => {
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const habit = await HabitRoutine.create({ userId: user._id, name:'Focus', schedule:{ recurrence:'daily', timeStart:'08:00' }, metrics:{ difficulty:3 } });
    // 7 days logs: success pattern alternating to create volatility
    for(let i=6;i>=0;i--){
      const d = new Date(today); d.setUTCDate(d.getUTCDate()-i); const status = (i % 2 === 0)? 'done':'missed';
      await HabitLog.create({ userId: user._id, habitRoutineId: habit._id, date: d, status });
    }
    const risk = await computeRiskForUser(user._id, 14);
    expect(Array.isArray(risk)).toBe(true);
    const item = risk.find(r=> r.habitId === String(habit._id));
    expect(item).toBeDefined();
    expect(item.successRate7).toBeGreaterThan(0);
    const heat = await computeHeatmapForUser(user._id, 7);
    expect(heat.cells.length).toBeGreaterThan(0);
  });
});
