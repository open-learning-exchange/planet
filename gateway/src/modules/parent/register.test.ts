import express from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'find': vi.fn() }));

vi.mock('../../config/couch.config', () => ({ 'anonymousConfigurationDB': { 'find': mocks.find } }));

import { registerParentRoutes } from './register';

let server: Server;
let baseUrl: string;

const check = (parentDomain: string, host?: string) => {
  mocks.find.mockResolvedValue({ 'docs': parentDomain ? [ { parentDomain } ] : [] });
  return fetch(`${baseUrl}/parent-check`, { 'headers': host ? { 'x-parent-host': host } : {} }).then((response) => response.status);
};

describe('parent check', () => {
  beforeAll(async () => {
    const app = express();
    registerParentRoutes(app);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it('allows only the configured parent\'s host', async () => {
    expect(await check('Nation.example/db', 'nation.example')).toEqual(204);
    expect(await check('nation.example:2200/db', 'nation.example:2200')).toEqual(204);
    expect(await check('nation.example/db', 'other.example')).toEqual(403);
  });

  it('refuses everything when there is no parent or no host', async () => {
    expect(await check('', '')).toEqual(403);
    expect(await check('nation.example/db')).toEqual(403);
  });
});
