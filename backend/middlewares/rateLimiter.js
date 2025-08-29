// Simple in-memory token bucket style rate limiter (per user or IP + routeKey)
// NOT production grade (single instance only) but good enough for initial hardening.
// Usage: rateLimiter({ windowMs: 60_000, max: 60, key: (req)=> req.user?.userId })

const stores = new Map(); // key -> {count, reset}

function rateLimiter(opts = {}) {
  const windowMs = opts.windowMs || 60_000;
  const max = opts.max || 60;
  const keyFn = opts.key || (req => req.ip);
  const onLimit = opts.onLimit || ((req,res)=> res.status(429).json({ message: 'Too many requests' }));
  const routeId = opts.id || 'default';
  return function(req,res,next){
    try {
      const kBase = keyFn(req) || 'anon';
      const key = `${routeId}:${kBase}`;
      const now = Date.now();
      let entry = stores.get(key);
      if(!entry || now >= entry.reset){
        entry = { count: 0, reset: now + windowMs };
        stores.set(key, entry);
      }
      entry.count++;
      if(entry.count > max){
        const retryAfter = Math.ceil((entry.reset - now)/1000);
        res.setHeader('Retry-After', retryAfter);
        return onLimit(req,res);
      }
      // Light header hints
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
      res.setHeader('X-RateLimit-Reset', Math.floor(entry.reset/1000));
      next();
    } catch(e){ next(); }
  };
}

module.exports = { rateLimiter };
