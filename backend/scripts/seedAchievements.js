/**
 * Seed MVP achievement definitions per user if absent.
 * This script is idempotent: it checks by (userId, seriesKey, tier).
 * Usage: node scripts/seedAchievements.js <userId?>
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Achievement = require('../models/Achievement');
const Users = require('../models/Users');

const SERIES = {
  STUDY_TIME: 'study_time_total',
  QUESTIONS: 'questions_total',
  STREAK: 'streak',
  DUEL: 'duel_played',
  DUEL_WIN: 'duel_won',
  FLASHCARD: 'flashcard_reviews',
  EXAM_NET: 'exam_net_total',
  TOPIC: 'topic_mastery',
  EFFICIENCY: 'efficiency_avg',
  HIDDEN_ZERO_DISTRACTION: 'zero_distractions',
  EARLY_BIRD: 'early_bird',
  COMEBACK: 'comeback'
};

// MVP achievement templates (without userId) – points reused as XP reward
const templates = [
  // Study time tiers
  { seriesKey: SERIES.STUDY_TIME, tier: 1, title: 'Focus Bronze', description: 'Toplam 500 dakika çalışma', icon: 'clock', points: 100, category: 'study_time', rarity: 'common', progressType: 'sumDuration', targetValue: 500 },
  { seriesKey: SERIES.STUDY_TIME, tier: 2, title: 'Focus Silver', description: 'Toplam 2000 dakika çalışma', icon: 'clock', points: 150, category: 'study_time', rarity: 'common', progressType: 'sumDuration', targetValue: 2000 },
  { seriesKey: SERIES.STUDY_TIME, tier: 3, title: 'Focus Gold', description: 'Toplam 5000 dakika çalışma', icon: 'clock', points: 250, category: 'study_time', rarity: 'rare', progressType: 'sumDuration', targetValue: 5000 },

  // Questions
  { seriesKey: SERIES.QUESTIONS, tier: 1, title: 'Novice Solver', description: '250 soru dene', icon: 'question', points: 80, category: 'questions', rarity: 'common', progressType: 'questions', targetValue: 250 },
  { seriesKey: SERIES.QUESTIONS, tier: 2, title: 'Steady Solver', description: '1000 soru dene', icon: 'question', points: 160, category: 'questions', rarity: 'common', progressType: 'questions', targetValue: 1000 },

  // Streak
  { seriesKey: SERIES.STREAK, tier: 1, title: '3-Gün Alevi', description: '3 gün üst üste çalış', icon: 'fire', points: 70, category: 'streak', rarity: 'common', progressType: 'streak', targetValue: 3 },
  { seriesKey: SERIES.STREAK, tier: 2, title: '7-Gün Serisi', description: '7 gün üst üste çalış', icon: 'fire', points: 120, category: 'streak', rarity: 'rare', progressType: 'streak', targetValue: 7 },

  // Duel basics
  { seriesKey: SERIES.DUEL, tier: 1, title: 'First Duel', description: 'İlk düellonu oyna', icon: 'thunderbolt', points: 50, category: 'duel', rarity: 'common', progressType: 'count', targetValue: 1 },

  // Flashcard
  { seriesKey: SERIES.FLASHCARD, tier: 1, title: 'Flashcard Apprentice', description: '50 flashcard incele', icon: 'book', points: 60, category: 'flashcard', rarity: 'common', progressType: 'count', targetValue: 50 },

  // Exam Net
  { seriesKey: SERIES.EXAM_NET, tier: 1, title: 'Trial Runner', description: 'İlk deneme netini kaydet', icon: 'trophy', points: 90, category: 'exam', rarity: 'common', progressType: 'examNet', targetValue: 1 },

  // Topic mastery
  { seriesKey: SERIES.TOPIC, tier: 1, title: 'Topic Explorer', description: '10 konu tamamla', icon: 'appstore', points: 100, category: 'topic', rarity: 'common', progressType: 'count', targetValue: 10 },

  // Efficiency
  { seriesKey: SERIES.EFFICIENCY, tier: 1, title: 'Efficient Start', description: '10 oturumda ortalama verim ≥ %60', icon: 'dashboard', points: 120, category: 'efficiency', rarity: 'rare', progressType: 'avgEfficiency', targetValue: 60 },

  // Hidden
  { seriesKey: SERIES.HIDDEN_ZERO_DISTRACTION, tier: 1, title: 'Zero Distractions', description: 'Dikkat dağınıklığı olmadan 10 kaliteli seans', icon: 'eye-invisible', points: 200, category: 'focus', rarity: 'epic', progressType: 'composite', targetValue: 10, hidden: true },
  { seriesKey: SERIES.COMEBACK, tier: 1, title: 'Comeback', description: 'Uzun aradan sonra geri dön ve 3 gün üst üste çalış', icon: 'reload', points: 200, category: 'streak', rarity: 'epic', progressType: 'composite', targetValue: 3, hidden: true }
];

async function ensureUserAchievements(userId) {
  for (const t of templates) {
    const exists = await Achievement.findOne({ userId, seriesKey: t.seriesKey, tier: t.tier });
    if (!exists) {
      await Achievement.create({
        userId,
        title: t.title,
        description: t.description,
        icon: t.icon,
        points: t.points,
        category: t.category,
        rarity: t.rarity,
        seriesKey: t.seriesKey,
        tier: t.tier,
        progressType: t.progressType,
        targetValue: t.targetValue,
        hidden: !!t.hidden,
        seasonal: false,
        currentValue: 0
      });
      process.stdout.write(`+ Seeded ${t.title} for user ${userId}\n`);
    }
  }
}

(async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/nik';
  await mongoose.connect(mongoUri);
  const userIdArg = process.argv[2];

  if (userIdArg) {
    await ensureUserAchievements(userIdArg);
  } else {
    const users = await Users.find({}, { _id: 1 }).limit(5000);
    for (const u of users) {
      await ensureUserAchievements(u._id);
    }
  }
  await mongoose.disconnect();
  process.exit(0);
})();
