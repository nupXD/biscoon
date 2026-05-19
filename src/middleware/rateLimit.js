const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = 50,
  blockMs = 0,
  keyFn,
  message = 'Too many requests. Please try again later.',
}) {
  const store = new Map();
  let lastSweepAt = 0;

  function sweep(now) {
    if (now - lastSweepAt < windowMs) return;
    lastSweepAt = now;
    for (const [key, entry] of store.entries()) {
      const freshHits = entry.hits.filter(timestamp => now - timestamp < windowMs);
      const stillBlocked = entry.blockedUntil && entry.blockedUntil > now;
      if (!freshHits.length && !stillBlocked) {
        store.delete(key);
        continue;
      }
      entry.hits = freshHits;
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    if (process.env.NODE_ENV === 'test') return next();

    const now = Date.now();
    sweep(now);

    const key = String(keyFn ? keyFn(req) : req.ip || 'unknown');
    const entry = store.get(key) || { hits: [], blockedUntil: 0 };

    if (entry.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return res.status(429).json({ error: message, retryAfter });
    }

    entry.hits = entry.hits.filter(timestamp => now - timestamp < windowMs);
    entry.hits.push(now);

    if (entry.hits.length > max) {
      if (blockMs > 0) {
        entry.blockedUntil = now + blockMs;
      }
      store.set(key, entry);
      const retryAfter = Math.ceil((blockMs || windowMs) / 1000);
      return res.status(429).json({ error: message, retryAfter });
    }

    store.set(key, entry);
    return next();
  };
}

function cleanEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function authKey(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';
  const email = cleanEmail(req.body && req.body.email);
  return `${ip}:${email || 'unknown-email'}`;
}

const authLoginLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  blockMs: 30 * 60 * 1000,
  keyFn: authKey,
  message: 'Too many login attempts. Please wait and try again.',
});

const authRegisterLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  blockMs: 60 * 60 * 1000,
  keyFn: authKey,
  message: 'Too many registration attempts. Please wait and try again.',
});

module.exports = {
  createRateLimiter,
  authLoginLimiter,
  authRegisterLimiter,
};
