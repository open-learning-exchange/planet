import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  consumeRequest,
  consumeWork,
  rateLimit,
  rateLimitWindowCount,
  resetRateLimiter
} from './rate-limit';

const mockResponse = (user?: string) => {
  const res: any = { 'locals': user ? { user } : {} };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (ip = '10.0.0.1') => ({ ip, 'method': 'POST', 'path': '/', 'route': { 'path': '/' } } as any);

describe('rate-limit middleware', () => {
  beforeEach(() => {
    resetRateLimiter();
    vi.useFakeTimers();
    delete process.env.RATE_LIMIT_PER_MINUTE;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.RATE_LIMIT_PER_MINUTE;
  });

  it('allows requests through the limit and rejects requests beyond it', () => {
    const limiter = rateLimit(3);
    const res = mockResponse('amara');
    const next = vi.fn();
    for (let count = 0; count < 3; count++) {
      limiter(mockRequest(), res, next);
    }
    expect(next).toHaveBeenCalledTimes(3);
    limiter(mockRequest(), res, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('denies all requests when the configured limit is zero', () => {
    process.env.RATE_LIMIT_PER_MINUTE = '0';
    const limiter = rateLimit();
    const res = mockResponse('amara');
    const next = vi.fn();

    limiter(mockRequest(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(rateLimitWindowCount()).toEqual(0);
  });

  it('lets an operator lower an explicit request limit', () => {
    process.env.RATE_LIMIT_PER_MINUTE = '2';
    expect(consumeRequest('amara:chat', 500)).toEqual(true);
    expect(consumeRequest('amara:chat', 500)).toEqual(true);
    expect(consumeRequest('amara:chat', 500)).toEqual(false);
  });

  it('counts fixed weighted work atomically without applying the operator request limit', () => {
    process.env.RATE_LIMIT_PER_MINUTE = '30';
    expect(consumeWork('amara:resource-cleanup', 300, 500)).toEqual(true);
    expect(consumeWork('amara:resource-cleanup', 201, 500)).toEqual(false);
    expect(consumeWork('amara:resource-cleanup', 200, 500)).toEqual(true);
    expect(consumeWork('amara:resource-cleanup', 1, 500)).toEqual(false);
  });

  it('applies the operator kill switch to fixed safety budgets', () => {
    process.env.RATE_LIMIT_PER_MINUTE = '0';
    expect(consumeWork('amara:resource-cleanup', 50, 500)).toEqual(false);
    expect(rateLimitWindowCount()).toEqual(0);
  });

  it('tracks session users independently', () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    limiter(mockRequest(), mockResponse('amara'), next);
    limiter(mockRequest(), mockResponse('bakari'), next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('falls back to independent IP keys without a session user', () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    limiter(mockRequest('10.0.0.1'), mockResponse(), next);
    limiter(mockRequest('10.0.0.2'), mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(2);
    const rejected = mockResponse();
    limiter(mockRequest('10.0.0.1'), rejected, next);
    expect(rejected.status).toHaveBeenCalledWith(429);
  });

  it('shares a labeled window between transport-specific middleware', () => {
    const httpLimiter = rateLimit(1, 'chat');
    const websocketLimiter = rateLimit(1, 'chat');
    const next = vi.fn();
    httpLimiter(mockRequest(), mockResponse('amara'), next);
    const rejected = mockResponse('amara');
    websocketLimiter(mockRequest(), rejected, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(rejected.status).toHaveBeenCalledWith(429);
  });

  it('resets after the fixed window and evicts expired identities', () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    limiter(mockRequest('10.0.0.1'), mockResponse(), vi.fn());
    limiter(mockRequest('10.0.0.2'), mockResponse(), vi.fn());
    expect(rateLimitWindowCount()).toEqual(2);
    vi.advanceTimersByTime(61000);
    limiter(mockRequest('10.0.0.1'), mockResponse('amara'), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(rateLimitWindowCount()).toEqual(1);
  });
});
