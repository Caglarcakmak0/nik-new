const Users = require('../models/Users');

// Kullanıcının planını hızlıca token'dan userId ile çeker
async function getUserPlan(userId) {
  const user = await Users.findById(userId).select('plan entitlements limits');
  if (!user) return null;
  return user;
}

// Belirli bir plan seviyesi gerektir
function requirePlan(minTier = 'premium') {
  const tiers = { free: 0, premium: 1 };
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
      const user = await getUserPlan(userId);
      if (!user) return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
      const userTier = user.plan?.tier || 'free';
      if ((tiers[userTier] || 0) < (tiers[minTier] || 0)) {
        return res.status(403).json({ message: 'Bu özellik için premium üyelik gerekir' });
      }
      next();
    } catch (e) {
      console.error('requirePlan error:', e);
      return res.status(500).json({ message: 'Plan kontrol hatası' });
    }
  };
}

// Belirli bir özelliği gerektir (entitlement bayrağı)
function requireEntitlement(flag) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
      const user = await getUserPlan(userId);
      if (!user) return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
      const has = Array.isArray(user.entitlements) && user.entitlements.includes(flag);
      if (!has) return res.status(403).json({ message: 'Bu özellik planınızda yer almıyor' });
      next();
    } catch (e) {
      console.error('requireEntitlement error:', e);
      return res.status(500).json({ message: 'Özellik kontrol hatası' });
    }
  };
}

module.exports = { requirePlan, requireEntitlement };


