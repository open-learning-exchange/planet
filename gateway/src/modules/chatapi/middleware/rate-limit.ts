import { NextFunction, Request, Response } from 'express';

const WINDOW_MS = 60000;
const DEFAULT_MAX_PER_MINUTE = 30;

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();
let nextCleanupAt = 0;

const nonNegativeIntegerOr = (value: number, fallback: number): number =>
  Number.isInteger(value) && value >= 0 ? value : fallback;

const configuredMax = (): number | undefined => {
  const configured = process.env.RATE_LIMIT_PER_MINUTE;
  return configured?.trim() ? nonNegativeIntegerOr(Number(configured), DEFAULT_MAX_PER_MINUTE) : undefined;
};

const removeExpiredWindows = (now: number) => {
  if (now < nextCleanupAt) {
    return;
  }
  for (const [ key, entry ] of windows) {
    if (entry.resetAt <= now) {
      windows.delete(key);
    }
  }
  nextCleanupAt = now + WINDOW_MS;
};

const consumeWindow = (key: string, cost: number, max: number): boolean => {
  if (max === 0 || !Number.isInteger(cost) || cost <= 0 || cost > max) {
    return false;
  }
  const now = Date.now();
  removeExpiredWindows(now);
  const entry = windows.get(key);
  if (!entry || now >= entry.resetAt) {
    windows.set(key, { 'count': cost, 'resetAt': now + WINDOW_MS });
    return true;
  }
  if (entry.count + cost > max) {
    return false;
  }
  entry.count += cost;
  return true;
};

/** Count weighted cleanup work without making valid batches depend on the request limit. */
export function consumeWork(key: string, cost: number, maxPerMinute: number): boolean {
  const max = configuredMax() === 0 ? 0 : nonNegativeIntegerOr(maxPerMinute, DEFAULT_MAX_PER_MINUTE);
  return consumeWindow(key, cost, max);
}

/** Count one user request, honoring both the operator and route ceilings. */
export const consumeRequest = (key: string, maxPerMinute?: number): boolean => {
  const operatorMax = configuredMax();
  const routeMax = maxPerMinute === undefined ? undefined : nonNegativeIntegerOr(maxPerMinute, DEFAULT_MAX_PER_MINUTE);
  const max = routeMax === undefined
    ? operatorMax ?? DEFAULT_MAX_PER_MINUTE
    : operatorMax === undefined ? routeMax : Math.min(operatorMax, routeMax);
  return consumeWindow(key, 1, max);
};

/** Build middleware, optionally sharing a label across multiple transports. */
export function rateLimit(maxPerMinute?: number, label?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const route = label || `${req.method} ${req.route?.path || req.path}`;
    const key = `${res.locals.user || req.ip}:${route}`;
    if (!consumeRequest(key, maxPerMinute)) {
      res.status(429).json({ 'error': 'Too Many Requests', 'message': 'Rate limit exceeded — try again in a minute' });
      return;
    }
    next();
  };
}

/** Clear all windows between tests. */
export function resetRateLimiter() {
  windows.clear();
  nextCleanupAt = 0;
}

/** Test hook for confirming expired-window eviction. */
export const rateLimitWindowCount = (): number => windows.size;
