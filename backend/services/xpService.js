const UserStats = require('../models/UserStats');
const XPEvent = require('../models/XPEvent');

// Leveling function (simple power curve)
const cumulativeCache = new Map([[1,0]]);
function cumulativeRequired(level) {
  if (cumulativeCache.has(level)) return cumulativeCache.get(level);
  let lastKnown = Math.max(...cumulativeCache.keys());
  let total = cumulativeCache.get(lastKnown);
  for (let i = lastKnown; i < level; i++) {
    if (i === 1) continue;
    total += Math.round(250 * Math.pow(i - 1, 1.6));
    cumulativeCache.set(i, total);
  }
  return cumulativeCache.get(level) || 0;
}

function levelForXP(totalXP) {
  let level = 1;
  while (true) {
    const next = cumulativeRequired(level + 1);
    if (totalXP < next) break;
    level++;
    if (level > 200) break; // safety
  }
  return level;
}

async function addXP(userId, amount, type, meta = {}) {
  if (amount <= 0) return { skipped: true };
  let stats = await UserStats.findOne({ userId });
  if (!stats) {
    stats = await UserStats.create({ userId });
  }
  const beforeXP = stats.totalXP;
  stats.totalXP += amount;
  stats.weeklyXP += amount;
  stats.monthlyXP += amount;
  const newLevel = levelForXP(stats.totalXP);
  const levelUp = newLevel > stats.currentLevel;
  stats.currentLevel = newLevel;
  const nextLevelCum = cumulativeRequired(newLevel + 1);
  const currentLevelCum = cumulativeRequired(newLevel);
  stats.nextLevelXP = nextLevelCum; // store threshold cumulative
  stats.currentLevelXP = stats.totalXP - currentLevelCum;

  // Streak update only for study_session events
  if (type === 'study_session') {
    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (!stats.lastActiveDate) {
      stats.streak = 1;
      stats.lastActiveDate = startOfToday;
    } else {
      const last = stats.lastActiveDate;
      const diffDays = Math.floor((startOfToday - new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()))) / 86400000);
      if (diffDays === 1) {
        stats.streak += 1;
        stats.lastActiveDate = startOfToday;
      } else if (diffDays > 1) {
        stats.streak = 1;
        stats.lastActiveDate = startOfToday;
      } // diffDays === 0 -> same day, no change
    }
    if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;
  }
  await stats.save();
  await XPEvent.create({ userId, type, amount, meta });
  return { levelUp, newLevel, gained: amount, totalXP: stats.totalXP, streak: stats.streak };
}

module.exports = { addXP };
