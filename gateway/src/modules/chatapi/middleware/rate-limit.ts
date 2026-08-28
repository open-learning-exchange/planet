import { NextFunction, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import { isIP } from 'net';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const WINDOW_SECONDS = 60;
const DEFAULT_MAX_PER_MINUTE = 30;
const DEFAULT_PRE_AUTH_MAX_PER_MINUTE = 120;

const limiters = new Map<number, RateLimiterMemory>();

interface ClientAddressRequest {
  headers?: IncomingHttpHeaders;
  ip?: string;
  socket?: { remoteAddress?: string | null };
}

const nonNegativeIntegerOr = (value: number, fallback: number): number =>
  Number.isInteger(value) && value >= 0 ? value : fallback;

const configuredMax = (): number | undefined => {
  const configured = process.env.RATE_LIMIT_PER_MINUTE;
  return configured?.trim() ? nonNegativeIntegerOr(Number(configured), DEFAULT_MAX_PER_MINUTE) : undefined;
};

const configuredPreAuthMax = (): number => {
  const configured = process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE;
  return configured?.trim()
    ? nonNegativeIntegerOr(Number(configured), DEFAULT_PRE_AUTH_MAX_PER_MINUTE)
    : DEFAULT_PRE_AUTH_MAX_PER_MINUTE;
};

const limiterFor = (points: number): RateLimiterMemory => {
  let limiter = limiters.get(points);
  if (!limiter) {
    limiter = new RateLimiterMemory({ points, 'duration': WINDOW_SECONDS });
    limiters.set(points, limiter);
  }
  return limiter;
};

const requestMax = (maxPerMinute?: number): number => {
  const operatorMax = configuredMax();
  const routeMax = maxPerMinute === undefined ? undefined : nonNegativeIntegerOr(maxPerMinute, DEFAULT_MAX_PER_MINUTE);
  return routeMax === undefined
    ? operatorMax ?? DEFAULT_MAX_PER_MINUTE
    : operatorMax === undefined ? routeMax : Math.min(operatorMax, routeMax);
};

/** Use the proxy-provided address only in topologies where direct gateway access is disabled. */
export const clientIp = (req: ClientAddressRequest): string => {
  if (process.env.TRUST_PROXY_CLIENT_IP === 'true') {
    const forwarded = req.headers?.['x-real-ip'];
    if (typeof forwarded === 'string' && isIP(forwarded.trim())) {
      return forwarded.trim();
    }
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

/** Count one WebSocket turn using the same keys and limits as HTTP chat. */
export const consumeRequest = async (key: string, maxPerMinute?: number): Promise<boolean> => {
  const max = requestMax(maxPerMinute);
  if (max === 0) {
    return false;
  }
  try {
    await limiterFor(max).consume(key);
    return true;
  } catch {
    return false;
  }
};

/** Count one request before session validation using the shared pre-auth quota. */
export const consumePreAuthRequest = async (key: string): Promise<boolean> => {
  const max = configuredPreAuthMax();
  if (max === 0) {
    return false;
  }
  try {
    await limiterFor(max).consume(`preauth:${key}`);
    return true;
  } catch {
    return false;
  }
};

const rejectRequest = (res: Response, message = 'Rate limit exceeded — try again in a minute') => {
  res.status(429).json({ 'error': 'Too Many Requests', message });
};

/** Build middleware, optionally sharing a label across multiple transports. */
export function rateLimit(maxPerMinute?: number, label?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const route = label || `${req.method} ${req.route?.path || req.path}`;
    const key = `${res.locals.user || clientIp(req)}:${route}`;
    const max = requestMax(maxPerMinute);
    if (max === 0) {
      rejectRequest(res);
      return;
    }
    try {
      await limiterFor(max).consume(key);
      next();
    } catch {
      rejectRequest(res);
    }
  };
}

/** Limit unauthenticated requests by IP before session validation reaches CouchDB. */
export function preAuthRateLimit() {
  return async function preAuthRateLimiter(req: Request, res: Response, next: NextFunction) {
    const route = `${req.method} ${req.route?.path || req.path}`;
    if (await consumePreAuthRequest(`${clientIp(req)}:${route}`)) {
      next();
    } else {
      rejectRequest(res);
    }
  };
}

/** Clear in-memory limits between tests. */
export function resetRateLimiter() {
  limiters.clear();
}
