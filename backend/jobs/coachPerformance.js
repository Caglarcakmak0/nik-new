const mongoose = require('mongoose');
const Users = require('../models/Users');
const CoachStudent = require('../models/CoachStudent');
const CoachFeedback = require('../models/CoachFeedback');
const CoachPerformance = require('../models/CoachPerformance');

/**
 * CoachPerformance Özetlerini yeniden hesaplar ve kaydeder.
 * Tüm koçlar için studentStats ve feedbackStats alanlarını günceller.
 */
async function rebuildAllCoachPerformance() {
  // Koç listesi (yalnızca rolü coach olan kullanıcılar)
  const coaches = await Users.find({ role: 'coach' }).select('_id');
  const coachIds = coaches.map((c) => c._id);

  if (coachIds.length === 0) return { updated: 0 };

  // Öğrenci sayıları (active/inactive) — coach bazında
  const studentAgg = await CoachStudent.aggregate([
    { $match: { coachId: { $in: coachIds } } },
    { $group: { _id: { coachId: '$coachId', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const studentStatsByCoach = new Map();
  for (const row of studentAgg) {
    const coachId = String(row._id.coachId);
    const status = row._id.status;
    const prev = studentStatsByCoach.get(coachId) || { active: 0, inactive: 0, total: 0 };
    if (status === 'active') prev.active += row.count;
    if (status === 'inactive') prev.inactive += row.count;
    prev.total = prev.active + prev.inactive;
    studentStatsByCoach.set(coachId, prev);
  }

  // Feedback özetleri — coach bazında
  const feedbackAgg = await CoachFeedback.aggregate([
    { $match: { coachId: { $in: coachIds } } },
    {
      $group: {
        _id: '$coachId',
        totalFeedbacks: { $sum: 1 },
        averageRating: { $avg: '$overallRating' },
        avgCommunication: { $avg: '$categories.communication' },
        avgProgramQuality: { $avg: '$categories.programQuality' },
        avgOverallSatisfaction: { $avg: '$categories.overallSatisfaction' },
        tooMuchPressure: { $sum: { $cond: [{ $eq: ['$specificIssues.tooMuchPressure', true] }, 1, 0] } },
        notEnoughSupport: { $sum: { $cond: [{ $eq: ['$specificIssues.notEnoughSupport', true] }, 1, 0] } },
        communicationProblems: { $sum: { $cond: [{ $eq: ['$specificIssues.communicationProblems', true] }, 1, 0] } },
        programNotSuitable: { $sum: { $cond: [{ $eq: ['$specificIssues.programNotSuitable', true] }, 1, 0] } },
        lastFeedbackDate: { $max: '$createdAt' },
      },
    },
  ]);

  const feedbackStatsByCoach = new Map();
  for (const row of feedbackAgg) {
    const coachId = String(row._id);
    feedbackStatsByCoach.set(coachId, {
      totalFeedbacks: row.totalFeedbacks || 0,
      averageRating: round1(row.averageRating || 0),
      categoryAverages: {
        communication: round2(row.avgCommunication || 0),
        programQuality: round2(row.avgProgramQuality || 0),
        overallSatisfaction: round2(row.avgOverallSatisfaction || 0),
      },
      issuesCounts: {
        tooMuchPressure: row.tooMuchPressure || 0,
        notEnoughSupport: row.notEnoughSupport || 0,
        communicationProblems: row.communicationProblems || 0,
        programNotSuitable: row.programNotSuitable || 0,
      },
      lastFeedbackDate: row.lastFeedbackDate || null,
    });
  }

  let updated = 0;
  for (const coachId of coachIds) {
    const key = String(coachId);
    const studentStats = studentStatsByCoach.get(key) || { total: 0, active: 0, inactive: 0 };
    const feedbackStats =
      feedbackStatsByCoach.get(key) || {
        totalFeedbacks: 0,
        averageRating: 0,
        categoryAverages: { communication: 0, programQuality: 0, overallSatisfaction: 0 },
        issuesCounts: { tooMuchPressure: 0, notEnoughSupport: 0, communicationProblems: 0, programNotSuitable: 0 },
        lastFeedbackDate: null,
      };

    await CoachPerformance.findOneAndUpdate(
      { coachId },
      {
        coachId,
        studentStats: {
          total: studentStats.total || 0,
          active: studentStats.active || 0,
          inactive: studentStats.inactive || 0,
        },
        feedbackStats,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    updated += 1;
  }

  return { updated };
}

function round1(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

let intervalHandle = null;

/**
 * Arka planda periyodik olarak CoachPerformance özetlerini günceller.
 * @param {Object} options
 * @param {number} options.intervalMinutes - Çalışma aralığı (dakika). Varsayılan 15.
 */
function startCoachPerformanceJob(options = {}) {
  const intervalMinutes = Number(options.intervalMinutes || process.env.COACH_PERF_INTERVAL_MIN || 15);

  // İlk çalıştırma (fire-and-forget)
  rebuildAllCoachPerformance().catch((err) => {
    console.error('CoachPerformance ilk rebuild hatası:', err);
  });

  // Periyodik çalıştırma
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(() => {
    rebuildAllCoachPerformance().catch((err) => {
      console.error('CoachPerformance rebuild hatası:', err);
    });
  }, intervalMinutes * 60 * 1000);
}

module.exports = {
  rebuildAllCoachPerformance,
  startCoachPerformanceJob,
};


