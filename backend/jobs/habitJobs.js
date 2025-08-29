const HabitRoutine = require('../models/HabitRoutine');
const HabitLog = require('../models/HabitLog');

function startHabitJobs(options = {}) {
  const dailyInitHourUTC = 0; // 00:05 approx (interval polling)
  const closeHourUTC = 23; // day end

  // every 5 minutes check tasks
  setInterval(async () => {
    const now = new Date();
    try {
      await ensureDailyInit(now);
      await ensureCloseDay(now);
    } catch (e) {
      console.error('[habitJobs] loop error:', e.message);
    }
  }, 5 * 60 * 1000);
}

async function ensureDailyInit(now) {
  if (now.getUTCHours() !== 0) return; // run near midnight UTC
  const day = startOfUTC(now);
  // check if already seeded: look for any log today
  const any = await HabitLog.findOne({ date: day });
  if (any) return;
  const routines = await HabitRoutine.find({ status: 'active' });
  const bulk = [];
  for (const r of routines) {
    if (r.isPlannedForDate && r.isPlannedForDate(now)) {
      bulk.push({ insertOne: { document: { userId: r.userId, habitRoutineId: r._id, date: day, status: 'pending' } } });
    }
  }
  if (bulk.length) {
    try { await HabitLog.bulkWrite(bulk, { ordered: false }); } catch (e) { /* ignore dup */ }
    console.log('[habitJobs] seeded logs:', bulk.length);
  }
}

async function ensureCloseDay(now) {
  if (now.getUTCHours() !== 23) return;
  const day = startOfUTC(now);
  // Find pending logs to mark missed and apply streak decay logic
  const pendings = await HabitLog.find({ date: day, status: 'pending' });
  if (!pendings.length) return;
  for (const log of pendings) {
    log.status = 'missed';
    await log.save();
    // Streak reset logic with decayProtection
    const routine = await HabitRoutine.findById(log.habitRoutineId);
    if (!routine) continue;
    if (routine.metrics.currentStreak > 0) {
      if (routine.behavior?.decayProtection && !routine.metrics.protectionUsed) {
        // First miss is forgiven: mark protection used, keep streak as-is
        routine.metrics.protectionUsed = true;
      } else {
        routine.metrics.currentStreak = 0; // reset
      }
      await routine.save();
    }
  }
  console.log('[habitJobs] closeDay processed missed logs:', pendings.length);
}

function startOfUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

module.exports = { startHabitJobs, ensureDailyInit, ensureCloseDay };
