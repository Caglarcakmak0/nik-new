const Achievement = require('../models/Achievement');
const Notification = require('../models/Notification');

// Incremental progress updates for simple progressTypes.
async function applySessionProgress(userId, session) {
  const increments = [];
  // Duration based (sumDuration)
  if (session.duration) {
    increments.push({ progressType: 'sumDuration', value: session.duration });
  }
  // Questions
  if (session.questionStats) {
    const qs = (session.questionStats.correctAnswers || 0) + (session.questionStats.wrongAnswers || 0) + (session.questionStats.blankAnswers || 0);
    if (qs > 0) increments.push({ progressType: 'questions', value: qs });
  }
  // Efficiency composite will be evaluated later, skip.

  for (const inc of increments) {
    await Achievement.updateMany(
      { userId, progressType: inc.progressType, unlockedAt: null },
      { $inc: { currentValue: inc.value } }
    );
  }

  // Unlock check: achievements where currentValue >= targetValue
  const toUnlock = await Achievement.find({ userId, unlockedAt: null, targetValue: { $gt: 0 }, $expr: { $gte: ['$currentValue', '$targetValue'] } });
  const unlockedIds = [];
  for (const ach of toUnlock) {
    ach.unlockedAt = new Date();
    await ach.save();
    unlockedIds.push(ach._id);
    // Fire notification (best effort)
    try {
      await Notification.create({
        userId,
        category: 'gamification',
        type: 'achievement_unlocked',
        title: `Rozet Kazanıldı: ${ach.title}`,
        body: `${ach.points} XP kazandın` ,
        importance: 'normal',
        actionUrl: '/achievements',
        meta: { achievementId: String(ach._id), points: ach.points }
      });
    } catch (e) { /* silent */ }
  }
  return unlockedIds;
}

module.exports = { applySessionProgress };
