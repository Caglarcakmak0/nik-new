const AISuggestion = require('../models/AISuggestion');

function startAISuggestionCleanupJob(options = {}){
  const intervalMs = options.intervalMs || 10 * 60 * 1000; // every 10 min
  setInterval(async ()=>{
    try {
      const now = new Date();
      // Expire documents past expiresAt
      const expired = await AISuggestion.updateMany({ expiresAt: { $lte: now }, status:'active' }, { $set: { status:'stale' } });
      // Hard delete very old stale (>30d) to keep collection lean
      const cutoff = new Date(now.getTime() - 30*24*60*60*1000);
      const deleted = await AISuggestion.deleteMany({ status:{ $in:['stale','dismissed','consumed'] }, updatedAt: { $lt: cutoff } });
      if((expired.modifiedCount||0) || (deleted.deletedCount||0)){
        console.log('[aiSuggestionCleanup] expired->', expired.modifiedCount || 0, 'deleted->', deleted.deletedCount || 0);
      }
    } catch(e){
      console.error('[aiSuggestionCleanup] error', e.message);
    }
  }, intervalMs);
}

module.exports = { startAISuggestionCleanupJob };