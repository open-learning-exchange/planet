import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/couch.config', () => ({ 'couchBaseUrl': 'http://couchdb:5984' }));

import {
  authenticateUpgrade,
  authSessionCookie,
  requireSession,
  requireSessionExcept
} from './auth';

const validSession = (name = 'amara', roles: string[] = [], headers = new Headers()) => ({
  'ok': true,
  headers,
  'json': async () => ({ 'userCtx': { name, roles } })
});

const mockResponse = () => {
  const res: any = { 'locals': {} };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockSocket = () => {
  const socket: any = {};
  socket.on = vi.fn().mockReturnValue(socket);
  socket.once = vi.fn().mockReturnValue(socket);
  socket.removeListener = vi.fn().mockReturnValue(socket);
  socket.end = vi.fn();
  socket.destroy = vi.fn();
  return socket;
};

const upgrade = async (headers: Record<string, string>, ws: unknown = {}) => {
  const socket = mockSocket();
  const responseHeaders: string[] = [];
  let onHeaders: (headers: string[], request: unknown) => void = () => undefined;
  const wss = {
    'on': vi.fn((event: string, listener: typeof onHeaders) => {
      onHeaders = listener;
    }),
    'handleUpgrade': vi.fn((request: unknown, upgradeSocket: unknown, head: unknown, done: (client: unknown) => void) => {
      onHeaders(responseHeaders, request);
      done(ws);
    }),
    'emit': vi.fn()
  };
  const req: any = { 'headers': { 'host': 'planet.local', ...headers } };
  await authenticateUpgrade(wss as any)(req, socket, Buffer.alloc(0));
  return { req, responseHeaders, socket, wss };
};

describe('gateway authentication', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('extracts only an exact non-empty AuthSession cookie', () => {
    expect(authSessionCookie('theme=dark; AuthSession=; AuthSession= deadbeef ; mode=compact')).toEqual('deadbeef');
    expect(authSessionCookie('AuthSessionId=wrong; MapAuthSession=wrong')).toBeUndefined();
    expect(authSessionCookie('AuthSession=   ')).toBeUndefined();
    expect(authSessionCookie(undefined)).toBeUndefined();
  });

  it('rejects requests without credentials before calling CouchDB', async () => {
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'theme=dark', 'authorization': 'Bearer token' } } as any, res, next);
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

  it('forwards only the session cookie and exposes the session', async () => {
    fetchMock.mockResolvedValue(validSession('amara', [ 'manager' ]));
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'theme=dark; AuthSession=deadbeef' } } as any, res, next);
    expect(fetchMock).toHaveBeenCalledWith('http://couchdb:5984/_session', {
      'headers': { 'cookie': 'AuthSession=deadbeef' },
      'signal': expect.any(AbortSignal)
    });
    expect(res.locals).toEqual({ 'session': { 'name': 'amara', 'roles': [ 'manager' ] } });
    expect(next).toHaveBeenCalled();
  });

  it('passes CouchDB\'s renewed session cookie back to the browser', async () => {
    const renewed = 'AuthSession=renewed; Version=1; Path=/; HttpOnly';
    fetchMock.mockResolvedValue(validSession('amara', [], new Headers({ 'set-cookie': renewed })));
    const res = mockResponse();
    res.append = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, vi.fn());
    expect(res.append).toHaveBeenCalledWith('Set-Cookie', renewed);
  });

  it('forwards Basic credentials, as myPlanet sends them', async () => {
    fetchMock.mockResolvedValue(validSession());
    const next = vi.fn();
    await requireSession({ 'headers': { 'authorization': 'Basic YW1hcmE6c2VjcmV0' } } as any, mockResponse(), next);
    expect(fetchMock).toHaveBeenCalledWith('http://couchdb:5984/_session', {
      'headers': { 'authorization': 'Basic YW1hcmE6c2VjcmV0' },
      'signal': expect.any(AbortSignal)
    });
    expect(next).toHaveBeenCalled();
  });

  it('returns 503 when CouchDB session validation is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error('connection refused'));
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('bounds concurrent CouchDB session validation for HTTP and WebSocket callers', async () => {
    const resolvers: Array<(response: any) => void> = [];
    fetchMock.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
    const checks = Array.from({ 'length': 8 }, (unused, index) => {
      void unused;
      return requireSession({ 'headers': { 'cookie': `AuthSession=${index}` } } as any, mockResponse(), vi.fn());
    });
    await vi.waitFor(() => expect(resolvers).toHaveLength(8));
    const res = mockResponse();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=overflow' } } as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(503);
    resolvers.forEach((resolve) => resolve(validSession()));
    await Promise.all(checks);
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

  describe('default-deny guard', () => {
    const guard = requireSessionExcept([ { 'methods': [ 'GET', 'HEAD' ], 'path': /^\/checkproviders\/?$/i } ]);
    const request = (method: string, path: string): any => ({ method, path, 'headers': {} });

    it('lets an open route through without a session', () => {
      const next = vi.fn();
      guard(request('GET', '/checkproviders'), mockResponse(), next);
      expect(next).toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      [ 'POST', '/checkproviders' ],
      [ 'GET', '/a-route-added-later' ]
    ])('requires a session for %s %s', async (method, path) => {
      const res = mockResponse();
      const next = vi.fn();
      guard(request(method, path), res, next);
      await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(401));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket upgrade', () => {
    it('refuses an untrusted origin before checking the session', async () => {
      const { socket, wss } = await upgrade({ 'origin': 'http://evil.test', 'cookie': 'AuthSession=deadbeef' });
      expect(socket.end).toHaveBeenCalledWith(expect.stringMatching(/^HTTP\/1\.1 403 /));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(wss.handleUpgrade).not.toHaveBeenCalled();
    });

    it('refuses a missing session with 401 and never opens the socket', async () => {
      const { socket, wss } = await upgrade({ 'origin': 'http://planet.local' });
      expect(socket.end).toHaveBeenCalledWith(expect.stringMatching(/^HTTP\/1\.1 401 /));
      expect(wss.handleUpgrade).not.toHaveBeenCalled();
    });

    it('refuses with 503 when CouchDB is unavailable', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      fetchMock.mockRejectedValue(new Error('connection refused'));
      const { socket, wss } = await upgrade({ 'cookie': 'AuthSession=deadbeef' });
      expect(socket.end).toHaveBeenCalledWith(expect.stringMatching(/^HTTP\/1\.1 503 /));
      expect(wss.handleUpgrade).not.toHaveBeenCalled();
    });

    it('opens the socket with the session for a trusted origin', async () => {
      fetchMock.mockResolvedValue(validSession());
      const ws = {};
      const { req, socket, wss } = await upgrade({ 'origin': 'http://planet.local', 'cookie': 'AuthSession=deadbeef' }, ws);
      expect(socket.end).not.toHaveBeenCalled();
      expect(wss.emit).toHaveBeenCalledWith('connection', ws, req, { 'name': 'amara', 'roles': [] });
    });

    it('passes CouchDB\'s renewed session cookie back on the 101 response', async () => {
      const renewed = 'AuthSession=renewed; Version=1; Path=/; HttpOnly';
      fetchMock.mockResolvedValue(validSession('amara', [], new Headers({ 'set-cookie': renewed })));
      const { responseHeaders } = await upgrade({ 'cookie': 'AuthSession=deadbeef' });
      expect(responseHeaders).toEqual([ `Set-Cookie: ${renewed}` ]);
    });
  });
});
