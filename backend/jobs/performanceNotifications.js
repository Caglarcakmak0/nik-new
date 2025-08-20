const DailyPlan = require('../models/DailyPlan');
const Users = require('../models/Users');
const Notification = require('../models/Notification');

let intervalHandle = null;

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function nowMinutesLocal() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

async function generateNoonAndEveningNotifications() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Öğrenciler
  const students = await Users.find({ role: 'student', 'preferences.notifications': { $ne: false } }).select('_id preferences');
  const currentMinutes = nowMinutesLocal();

  for (const u of students) {
    try {
      const { notificationThresholds = {}, quietHours = {}, maxNotificationsPerDay = 10 } = u.preferences || {};
      const morningThreshold = Number(notificationThresholds.morningCompletion ?? 25);
      const eveningThreshold = Number(notificationThresholds.eveningCompletion ?? 75);

      // Sessiz saatlerde sadece merkez (yine de kayda düşür) — UI tarafı toast göstermeyebilir.
      const quietStart = parseTimeToMinutes(quietHours?.start || '22:00');
      const quietEnd = parseTimeToMinutes(quietHours?.end || '08:00');

      const plans = await DailyPlan.find({ userId: u._id, date: { $gte: todayStart, $lte: todayEnd } });
      if (!plans || plans.length === 0) continue;
      const plan = plans[0];
      const completion = Number(plan?.stats?.completionRate || 0);

      // 12:00 +/- 5 dk aralığında düşük tamamlanma uyarısı
      if (currentMinutes >= 12 * 60 && currentMinutes <= 12 * 60 + 5 && completion < morningThreshold) {
        const dateParam = now.toISOString().slice(0,10);
        const dedupeKey = `noon_perf:${u._id}:${dateParam}`;
        await Notification.create({
          userId: u._id,
          category: 'performance',
          type: 'noon_low_completion',
          title: 'Öğle performans kontrolü',
          body: 'Hedefin gerisindesin. Kısa bir odak seansı iyi gelebilir.',
          actionUrl: `/study-plan?date=${dateParam}`,
          importance: 'normal',
          dedupeKey,
          meta: { completion }
        }).catch(() => {});
      }

      // 19:30 +/- 5 dk aralığında akşam sprint uyarısı
      if (currentMinutes >= 19 * 60 + 30 && currentMinutes <= 19 * 60 + 35 && completion < eveningThreshold) {
        const dateParam = now.toISOString().slice(0,10);
        const dedupeKey = `evening_sprint:${u._id}:${dateParam}`;
        await Notification.create({
          userId: u._id,
          category: 'performance',
          type: 'evening_sprint',
          title: 'Akşam sprinti zamanı',
          body: 'Günü güçlü kapatmak için kısa bir sprint yapalım.',
          actionUrl: `/study-plan?date=${dateParam}`,
          importance: 'high',
          dedupeKey,
          meta: { completion }
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Performance notification error:', e);
    }
  }
}

function startPerformanceNotificationsJob(options = {}) {
  const intervalSeconds = Number(options.intervalSeconds || process.env.PERF_NOTIF_INTERVAL_SEC || 60);
  if (intervalHandle) clearInterval(intervalHandle);
  // İlk çalıştırma
  generateNoonAndEveningNotifications().catch(() => {});
  intervalHandle = setInterval(() => {
    generateNoonAndEveningNotifications().catch(() => {});
  }, Math.max(intervalSeconds, 30) * 1000);
}

module.exports = { startPerformanceNotificationsJob };


