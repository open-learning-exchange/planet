import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  consumeRequest,
  rateLimit,
  resetRateLimiter
} from './rate-limit';

const mockResponse = (user?: string) => {
  const res: any = { 'locals': user ? { user } : {} };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (ip = '10.0.0.1') => ({
  ip,
  'method': 'POST',
  'path': '/',
  'route': { 'path': '/' }
} as any);

describe('rate-limit middleware', () => {
  beforeEach(() => {
    resetRateLimiter();
    delete process.env.RATE_LIMIT_PER_MINUTE;
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_PER_MINUTE;
  });

  it('allows requests through the limit and rejects requests beyond it', async () => {
    const limiter = rateLimit(3);
    const res = mockResponse('amara');
    const next = vi.fn();
    for (let count = 0; count < 3; count++) {
      await limiter(mockRequest(), res, next);
    }
    expect(next).toHaveBeenCalledTimes(3);
    await limiter(mockRequest(), res, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('denies all requests when the configured limit is zero', async () => {
    process.env.RATE_LIMIT_PER_MINUTE = '0';
    const limiter = rateLimit();
    const res = mockResponse('amara');
    const next = vi.fn();

    await limiter(mockRequest(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('lets an operator lower an explicit request limit', async () => {
    process.env.RATE_LIMIT_PER_MINUTE = '2';
    await expect(consumeRequest('amara:chat', 500)).resolves.toEqual(true);
    await expect(consumeRequest('amara:chat', 500)).resolves.toEqual(true);
    await expect(consumeRequest('amara:chat', 500)).resolves.toEqual(false);
  });

  it('tracks session users independently', async () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    await limiter(mockRequest(), mockResponse('amara'), next);
    await limiter(mockRequest(), mockResponse('bakari'), next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('falls back to independent IP keys without a session user', async () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    await limiter(mockRequest('10.0.0.1'), mockResponse(), next);
    await limiter(mockRequest('10.0.0.2'), mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(2);
    const rejected = mockResponse();
    await limiter(mockRequest('10.0.0.1'), rejected, next);
    expect(rejected.status).toHaveBeenCalledWith(429);
  });

  it('shares a labeled window between HTTP middleware and WebSocket turns', async () => {
    const httpLimiter = rateLimit(1, 'chat');
    const next = vi.fn();
    await httpLimiter(mockRequest(), mockResponse('amara'), next);

    expect(next).toHaveBeenCalledTimes(1);
    await expect(consumeRequest('amara:chat', 1)).resolves.toEqual(false);
  });

});
