import express from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'getKeys': vi.fn(), 'setKey': vi.fn(), 'removeKey': vi.fn() }));

vi.mock('../../config/couch.config', () => ({ 'couchBaseUrl': 'http://couchdb:5984', 'configurationDB': {}, 'keysDB': {} }));
vi.mock('../../services/keys.service', () => mocks);

import { registerKeyRoutes } from './register';

let server: Server;
let baseUrl: string;

const request = (path: string, roles: string, init: RequestInit = {}) => fetch(`${baseUrl}${path}`, {
  ...init,
  'headers': { 'content-type': 'application/json', 'x-test-roles': roles }
});

describe('key routes', () => {
  beforeAll(async () => {
    const app = express();
    app.use((req, res, next) => {
      res.locals.session = { 'name': 'amara', 'roles': String(req.headers['x-test-roles']).split(',').filter(Boolean) };
      next();
    });
    app.use(express.json());
    registerKeyRoutes(app);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    mocks.getKeys.mockReset();
    mocks.setKey.mockReset().mockResolvedValue(undefined);
    mocks.removeKey.mockReset().mockResolvedValue(undefined);
  });

  it('refuses members who aren\'t managers', async () => {
    const put = await request('/keys/ai/openai', 'learner', { 'method': 'PUT', 'body': JSON.stringify({ 'key': 'sk-1' }) });

    expect((await request('/keys', 'learner')).status).toEqual(403);
    expect(put.status).toEqual(403);
    expect(mocks.setKey).not.toHaveBeenCalled();
  });

  it('reports whether each key is set, never the key', async () => {
    mocks.getKeys.mockImplementation(async (service: string) => (service === 'ai' ? { 'openai': 'sk-secret' } : {}));

    const response = await request('/keys', 'manager');
    const body = await response.text();

    expect(JSON.parse(body)).toEqual({
      'ai': { 'openai': true, 'perplexity': false, 'deepseek': false, 'gemini': false },
      'currency': { 'openexchangerates': false }
    });
    expect(body).not.toContain('sk-secret');
  });

  it('saves and removes known keys for managers and server admins', async () => {
    const saved = await request('/keys/ai/openai', '_admin', { 'method': 'PUT', 'body': JSON.stringify({ 'key': ' sk-2 ' }) });
    const removed = await request('/keys/currency/openexchangerates', 'manager', { 'method': 'DELETE' });

    expect([ saved.status, removed.status ]).toEqual([ 204, 204 ]);
    expect(mocks.setKey).toHaveBeenCalledWith('ai', 'openai', 'sk-2');
    expect(mocks.removeKey).toHaveBeenCalledWith('currency', 'openexchangerates');
  });

  it('refuses unknown and blank keys', async () => {
    const put = (path: string, key: unknown) => request(path, 'manager', { 'method': 'PUT', 'body': JSON.stringify({ key }) });

    expect((await put('/keys/ai/anthropic', 'sk-1')).status).toEqual(404);
    expect((await put('/keys/constructor/name', 'sk-1')).status).toEqual(404);
    expect((await put('/keys/ai/openai', '  ')).status).toEqual(400);
    expect((await put('/keys/ai/openai', 42)).status).toEqual(400);
    expect(mocks.setKey).not.toHaveBeenCalled();
  });
});
