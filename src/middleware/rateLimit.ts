import { Request, Response, NextFunction } from 'express';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

interface RateLimitEntry {
  hits: number[];
  blockedUntil: number;
}

interface CreateRateLimiterOptions {
  windowMs?: number;
  max?: number;
  blockMs?: number;
  keyFn?: (req: Request) => string;
  message?: string;
}

function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = 50,
  blockMs = 0,
  keyFn,
  message = 'Too many requests. Please try again later.',
}: CreateRateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();
  let lastSweepAt = 0;

  function sweep(now: number): void {
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

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (process.env.NODE_ENV === 'test') { next(); return; }

    const now = Date.now();
    sweep(now);

    const key = String(keyFn ? keyFn(req) : req.ip || 'unknown');
    const entry = store.get(key) || { hits: [], blockedUntil: 0 };

    if (entry.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    entry.hits = entry.hits.filter(timestamp => now - timestamp < windowMs);
    entry.hits.push(now);

    if (entry.hits.length > max) {
      if (blockMs > 0) {
        entry.blockedUntil = now + blockMs;
      }
      store.set(key, entry);
      const retryAfter = Math.ceil((blockMs || windowMs) / 1000);
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    store.set(key, entry);
    next();
  };
}

function cleanEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function authKey(req: Request): string {
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

const authRecoveryLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 6,
  blockMs: 60 * 60 * 1000,
  keyFn: authKey,
  message: 'Too many account recovery attempts. Please wait and try again.',
});

export {
  createRateLimiter,
  authLoginLimiter,
  authRegisterLimiter,
  authRecoveryLimiter,
};
