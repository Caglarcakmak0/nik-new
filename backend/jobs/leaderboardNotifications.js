const LeaderboardRoute = require('../routes/leaderboard');
const Users = require('../models/Users');
const Notification = require('../models/Notification');

// Not: Mevcut kodda leaderboard hesaplaması route içinde. Basit bir yaklaşım: haftada/günde 1 kez route mantığını çağırmak yerine,
// burada sadece önceki rank bilgisini Users.stats içine koyup önemli değişimleri yakalamak tercih edilir.
// Bu MVP job, sadece top10 girişini tespit eden basit bir sorgu ile ilerler (genişletilebilir).

let dailyTimer = null;

async function detectTop10Entrants() {
  // Bu iş, frontende/yapılandırmaya göre basitleştirilmiştir.
  // Gelişmiş hesaplama için backend/routes/leaderboard.js içindeki agregasyonu job'a taşımak önerilir.
  try {
    // Şimdilik atlanıyor; ileride aggregate ile top10 listesi çıkarılacak ve geçen günün listesiyle fark alınacak.
  } catch (e) {
    console.error('Leaderboard notification job error:', e);
  }
}

function startLeaderboardNotificationsJob(options = {}) {
  const intervalHours = Number(options.intervalHours || process.env.LB_NOTIF_INTERVAL_HRS || 24);
  if (dailyTimer) clearInterval(dailyTimer);
  dailyTimer = setInterval(() => {
    detectTop10Entrants().catch(() => {});
  }, Math.max(intervalHours, 1) * 60 * 60 * 1000);
}

module.exports = { startLeaderboardNotificationsJob };


