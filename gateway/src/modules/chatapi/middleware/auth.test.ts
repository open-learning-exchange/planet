import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import cors from 'cors';

vi.mock('../../../config/couch.config', () => ({ 'couchBaseUrl': 'http://couchdb:5984' }));

import {
  allowedOrigins,
  authSessionCookie,
  browserCorsOptions,
  getSession,
  isAuthRequired,
  isTrustedOrigin,
  requestScheme,
  requireSession,
  SessionValidationBusyError,
  validateSession
} from './auth';

const mockResponse = () => {
  const res: any = { 'locals': {} };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const corsHeaders = async (origin: string, scheme = 'http') => {
  const headers = new Map<string, unknown>();
  const req: any = { 'method': 'GET', 'headers': { origin, 'host': 'planet.local:5000' } };
  const res: any = {
    'getHeader': (name: string) => headers.get(name.toLowerCase()),
    'setHeader': (name: string, value: unknown) => headers.set(name.toLowerCase(), value)
  };
  const middleware = cors((request, callback) => {
    callback(null, browserCorsOptions(request.headers.origin, request.headers.host, scheme));
  });
  await new Promise<void>((resolve, reject) => middleware(req, res, (error?: unknown) => error ? reject(error) : resolve()));
  return headers;
};

describe('authentication middleware', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    delete process.env.CHATAPI_AUTH;
    delete process.env.CORS_ORIGINS;
    delete process.env.COUCHDB_SESSION_TIMEOUT_MS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.CHATAPI_AUTH;
    delete process.env.CORS_ORIGINS;
    delete process.env.COUCHDB_SESSION_TIMEOUT_MS;
  });

  it('requires authentication unless explicitly disabled', () => {
    expect(isAuthRequired()).toEqual(true);
    process.env.CHATAPI_AUTH = 'none';
    expect(isAuthRequired()).toEqual(false);
  });

  it('extracts only an exact non-empty AuthSession cookie', () => {
    expect(authSessionCookie('theme=dark; AuthSession=; AuthSession= deadbeef ; mode=compact')).toEqual('deadbeef');
    expect(authSessionCookie('AuthSessionId=wrong; MapAuthSession=wrong')).toBeUndefined();
    expect(authSessionCookie('AuthSession=   ')).toBeUndefined();
    expect(authSessionCookie(undefined)).toBeUndefined();
  });

  it('parses only configured cross-origin additions', () => {
    expect(allowedOrigins()).toEqual([]);
    process.env.CORS_ORIGINS = ' http://localhost:3000, https://planet.example , ';
    expect(allowedOrigins()).toEqual([ 'http://localhost:3000', 'https://planet.example' ]);
  });

  it('trusts exact request hosts and configured origins only', () => {
    expect(isTrustedOrigin('https://planet.example:8443', 'planet.example:8443', 'https')).toEqual(true);
    expect(isTrustedOrigin('https://planet.example:8443', 'planet.example', 'https')).toEqual(false);
    process.env.CORS_ORIGINS = 'https://planet.example:8443';
    expect(isTrustedOrigin('https://planet.example:8443', 'planet.example', 'https')).toEqual(true);
    expect(isTrustedOrigin('not a URL', 'planet.example', 'https')).toEqual(false);
  });

  it('requires matching schemes for same-origin browser access', () => {
    expect(isTrustedOrigin('https://planet.example:8443', 'planet.example:8443', 'https')).toEqual(true);
    expect(isTrustedOrigin('http://planet.example:8443', 'planet.example:8443', 'https')).toEqual(false);
  });

  it('uses the original proxy scheme when supplied', () => {
    expect(requestScheme({ 'x-forwarded-proto': 'https, http' })).toEqual('https');
    expect(requestScheme({})).toEqual('http');
  });

  it('reflects trusted CORS origins and emits no wildcard for untrusted origins', async () => {
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    const trusted = await corsHeaders('http://localhost:3000');
    const untrusted = await corsHeaders('http://evil.test');

    expect(trusted.get('access-control-allow-origin')).toEqual('http://localhost:3000');
    expect(trusted.get('access-control-allow-credentials')).toEqual('true');
    expect(untrusted.has('access-control-allow-origin')).toEqual(false);
  });

  it('does not reflect a same-host origin with the wrong scheme', async () => {
    const headers = await corsHeaders('http://planet.local:5000', 'https');
    expect(headers.has('access-control-allow-origin')).toEqual(false);
  });

  it('bypasses validation when disabled', async () => {
    process.env.CHATAPI_AUTH = 'none';
    const next = vi.fn();
    await requireSession({ 'headers': {} } as any, mockResponse(), next);
    expect(next).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects requests without an AuthSession cookie', async () => {
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid session', async () => {
    fetchMock.mockResolvedValue({ 'ok': true, 'json': async () => ({ 'userCtx': { 'name': null } }) });
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid session and exposes the user and roles', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue({
      'ok': true,
      'json': async () => ({ 'userCtx': { 'name': 'amara', 'roles': [ 'manager' ] } })
    });
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, next);
    expect(fetchMock).toHaveBeenCalledWith('http://couchdb:5984/_session', {
      'headers': { 'cookie': 'AuthSession=deadbeef' },
      'signal': expect.any(AbortSignal)
    });
    expect(timeout).toHaveBeenCalledWith(10000);
    expect(res.locals).toEqual({ 'user': 'amara', 'roles': [ 'manager' ] });
    expect(next).toHaveBeenCalled();
  });

  it('returns 503 when CouchDB session validation is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'));
    await expect(getSession('AuthSession=deadbeef')).rejects.toThrow('Planet session validation is unavailable');
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('bounds concurrent CouchDB session validation for HTTP and WebSocket callers', async () => {
    const resolvers: Array<(response: any) => void> = [];
    fetchMock.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
    const validations = Array.from({ 'length': 8 }, (unused, index) => {
      void unused;
      return validateSession(`AuthSession=${index}`);
    });
    await vi.waitFor(() => expect(resolvers).toHaveLength(8));
    await expect(validateSession('AuthSession=overflow')).rejects.toBeInstanceOf(SessionValidationBusyError);
    resolvers.forEach((resolve) => resolve({
      'ok': true,
      'json': async () => ({ 'userCtx': { 'name': 'amara', 'roles': [] } })
    }));
    await Promise.all(validations);
  });

  it.each([ 408, 429 ])('returns 503 when CouchDB session validation responds with %s', async (status) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockResolvedValue({ 'ok': false, status });
    const res = mockResponse();
    const next = vi.fn();

    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining(`CouchDB status ${status}`));
  });

  it.each([ 400, 401, 403 ])('treats CouchDB status %s as an invalid session', async (status) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockResolvedValue({ 'ok': false, status });
    const res = mockResponse();
    const next = vi.fn();

    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
