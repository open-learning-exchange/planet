import { NextFunction, Request, Response } from 'express';

/**
 * Minimal fixed-window in-memory rate limiter, keyed per session user (or IP)
 * and route. Enough for a single-instance gateway guarding paid AI calls;
 * swap for a shared store if the gateway ever runs more than one instance.
 */

const WINDOW_MS = 60000;

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

const defaultMax = () => Number(process.env.RATE_LIMIT_PER_MINUTE || 30);

export function rateLimit(maxPerMinute?: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const max = maxPerMinute || defaultMax();
    const key = `${res.locals.user || req.ip}:${req.method} ${req.route?.path || req.path}`;
    const now = Date.now();
    const entry = windows.get(key);
    if (!entry || now >= entry.resetAt) {
      windows.set(key, { 'count': 1, 'resetAt': now + WINDOW_MS });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      res.status(429).json({ 'error': 'Too Many Requests', 'message': 'Rate limit exceeded — try again in a minute' });
      return;
    }
    next();
  };
}

/** Test hook — clears all rate limit windows. */
export function resetRateLimiter() {
  windows.clear();
}
