import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clientIp,
  consumeRequest,
  preAuthRateLimit,
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
  'headers': {},
  ip,
  'method': 'POST',
  'path': '/',
  'route': { 'path': '/' },
  'socket': { 'remoteAddress': ip }
} as any);

describe('rate-limit middleware', () => {
  beforeEach(() => {
    resetRateLimiter();
    delete process.env.RATE_LIMIT_PER_MINUTE;
    delete process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE;
    delete process.env.TRUST_PROXY_CLIENT_IP;
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_PER_MINUTE;
    delete process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE;
    delete process.env.TRUST_PROXY_CLIENT_IP;
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

  it('limits unauthenticated requests by IP before a session is available', async () => {
    process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE = '1';
    const limiter = preAuthRateLimit();
    const next = vi.fn();

    await limiter(mockRequest('10.0.0.1'), mockResponse(), next);
    const rejected = mockResponse();
    await limiter(mockRequest('10.0.0.1'), rejected, next);
    await limiter(mockRequest('10.0.0.2'), mockResponse(), next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(rejected.status).toHaveBeenCalledWith(429);
  });

  it('uses nginx client addresses only when proxy trust is explicitly enabled', () => {
    const req = mockRequest('172.18.0.4');
    req.headers['x-real-ip'] = '192.0.2.10';

    expect(clientIp(req)).toEqual('172.18.0.4');
    process.env.TRUST_PROXY_CLIENT_IP = 'true';
    expect(clientIp(req)).toEqual('192.0.2.10');

    req.headers['x-real-ip'] = '192.0.2.10, 198.51.100.8';
    expect(clientIp(req)).toEqual('172.18.0.4');
  });

  it('keeps proxied clients in independent pre-auth buckets', async () => {
    process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE = '1';
    process.env.TRUST_PROXY_CLIENT_IP = 'true';
    const limiter = preAuthRateLimit();
    const next = vi.fn();
    const first = mockRequest('172.18.0.4');
    first.headers['x-real-ip'] = '192.0.2.10';
    const second = mockRequest('172.18.0.4');
    second.headers['x-real-ip'] = '192.0.2.11';

    await limiter(first, mockResponse(), next);
    await limiter(second, mockResponse(), next);
    const rejected = mockResponse();
    await limiter(first, rejected, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(rejected.status).toHaveBeenCalledWith(429);
  });

  it('uses the default pre-auth limit when its environment variable is empty', async () => {
    process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE = '';
    const next = vi.fn();

    await preAuthRateLimit()(mockRequest(), mockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('shares a labeled window between HTTP middleware and WebSocket turns', async () => {
    const httpLimiter = rateLimit(1, 'chat');
    const next = vi.fn();
    await httpLimiter(mockRequest(), mockResponse('amara'), next);

    expect(next).toHaveBeenCalledTimes(1);
    await expect(consumeRequest('amara:chat', 1)).resolves.toEqual(false);
  });

});
