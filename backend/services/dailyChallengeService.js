const UserDailyChallenge = require('../models/UserDailyChallenge');
const dayjs = require('dayjs');

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0,10);
}

async function getOrGenerate(userId) {
  const dateKey = utcDateKey();
  let doc = await UserDailyChallenge.findOne({ userId, dateKey });
  if (!doc) {
    // Simple generation rules
    const challenges = [
      {
        key: 'daily_study_minutes',
        title: '120 dk Çalış',
        description: 'Toplam 120 dk çalışma süresine ulaş',
        target: 120,
        current: 0,
        xpReward: 150,
        category: 'study'
      },
      {
        key: 'daily_questions',
        title: '50 Soru Çöz',
        description: 'Günün içinde 50 soru dene',
        target: 50,
        current: 0,
        xpReward: 125,
        category: 'questions'
      }
    ];
    doc = await UserDailyChallenge.create({ userId, dateKey, challenges });
  }
  return doc;
}

async function incrementProgress(userId, updates) {
  const dateKey = utcDateKey();
  const doc = await getOrGenerate(userId);
  let modified = false;
  for (const u of updates) {
    const c = doc.challenges.find(ch => ch.key === u.key);
    if (c && !c.isCompleted) {
      c.current += u.value;
      if (c.current >= c.target) {
        c.current = c.target;
        c.isCompleted = true;
      }
      modified = true;
    }
  }
  if (modified) await doc.save();
  return doc;
}

async function claim(userId, key) {
  const dateKey = utcDateKey();
  const doc = await UserDailyChallenge.findOne({ userId, dateKey });
  if (!doc) return { error: 'No challenges for today' };
  const c = doc.challenges.find(ch => ch.key === key);
  if (!c) return { error: 'Challenge not found' };
  if (!c.isCompleted) return { error: 'Challenge not completed' };
  if (c.claimed) return { error: 'Already claimed' };
  c.claimed = true;
  await doc.save();
  return { challenge: c };
}

module.exports = { getOrGenerate, incrementProgress, claim };
