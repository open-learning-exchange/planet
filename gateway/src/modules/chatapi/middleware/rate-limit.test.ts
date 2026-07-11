import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rateLimit, resetRateLimiter } from './rate-limit';

const mockResponse = (user?: string) => {
  const res: any = { 'locals': user ? { user } : {} };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (ip = '10.0.0.1') => ({ ip, 'method': 'POST', 'path': '/', 'route': { 'path': '/' } } as any);

describe('rate limit middleware', () => {
  beforeEach(() => {
    resetRateLimiter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit and rejects beyond it', () => {
    const limiter = rateLimit(3);
    const res = mockResponse('amara');
    const next = vi.fn();
    for (let i = 0; i < 3; i++) {
      limiter(mockRequest(), res, next);
    }
    expect(next).toHaveBeenCalledTimes(3);
    limiter(mockRequest(), res, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('tracks users independently', () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    limiter(mockRequest(), mockResponse('amara'), next);
    limiter(mockRequest(), mockResponse('bakari'), next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('falls back to the IP when there is no session user', () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    limiter(mockRequest('10.0.0.1'), mockResponse(), next);
    limiter(mockRequest('10.0.0.2'), mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(2);
    const res = mockResponse();
    limiter(mockRequest('10.0.0.1'), res, next);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('resets after the window elapses', () => {
    const limiter = rateLimit(1);
    const next = vi.fn();
    limiter(mockRequest(), mockResponse('amara'), next);
    vi.advanceTimersByTime(61000);
    limiter(mockRequest(), mockResponse('amara'), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
