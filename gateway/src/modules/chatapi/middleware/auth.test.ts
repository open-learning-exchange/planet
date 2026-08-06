import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../config/couch.config', () => ({ 'couchBaseUrl': 'http://couchdb:5984' }));

import { getSessionUser, isAuthRequired, requireManager, requireSession } from './auth';

const mockResponse = () => {
  const res: any = { 'locals': {} };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('auth middleware', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    delete process.env.CHATAPI_AUTH;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CHATAPI_AUTH;
  });

  it('is required unless CHATAPI_AUTH=none', () => {
    expect(isAuthRequired()).toEqual(true);
    process.env.CHATAPI_AUTH = 'none';
    expect(isAuthRequired()).toEqual(false);
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

  it('accepts a valid session and exposes the user', async () => {
    fetchMock.mockResolvedValue({ 'ok': true, 'json': async () => ({ 'userCtx': { 'name': 'amara' } }) });
    const res = mockResponse();
    const next = vi.fn();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, next);
    expect(fetchMock).toHaveBeenCalledWith('http://couchdb:5984/_session', { 'headers': { 'cookie': 'AuthSession=deadbeef' } });
    expect(res.locals.user).toEqual('amara');
    expect(next).toHaveBeenCalled();
  });

  it('returns null when CouchDB is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'));
    expect(await getSessionUser('AuthSession=deadbeef')).toBeNull();
  });

  it('exposes session roles for downstream authorization', async () => {
    fetchMock.mockResolvedValue({ 'ok': true, 'json': async () => ({ 'userCtx': { 'name': 'amara', 'roles': [ 'manager' ] } }) });
    const res = mockResponse();
    await requireSession({ 'headers': { 'cookie': 'AuthSession=deadbeef' } } as any, res, vi.fn());
    expect(res.locals.roles).toEqual([ 'manager' ]);
  });

  it('requireManager rejects sessions without a manage role', () => {
    const res = mockResponse();
    res.locals.roles = [ 'learner' ];
    const next = vi.fn();
    requireManager({} as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireManager accepts manager and admin sessions', () => {
    for (const role of [ 'manager', '_admin' ]) {
      const res = mockResponse();
      res.locals.roles = [ role ];
      const next = vi.fn();
      requireManager({} as any, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('requireManager bypasses when auth is disabled', () => {
    process.env.CHATAPI_AUTH = 'none';
    const next = vi.fn();
    requireManager({} as any, mockResponse(), next);
    expect(next).toHaveBeenCalled();
  });
});
