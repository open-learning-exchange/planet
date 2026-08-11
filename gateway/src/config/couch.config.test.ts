import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'nano': vi.fn(() => ({ 'use': vi.fn(() => ({})) }))
}));

vi.mock('nano', () => ({ 'default': mocks.nano }));
vi.mock('dotenv', () => ({ 'default': { 'config': vi.fn() } }));

describe('CouchDB configuration', () => {
  afterEach(() => {
    delete process.env.COUCHDB_HOST;
    delete process.env.COUCHDB_USER;
    delete process.env.COUCHDB_PASS;
    vi.resetModules();
  });

  it('removes embedded credentials from the session-validation base URL', async () => {
    process.env.COUCHDB_HOST = 'http://embedded:secret@localhost:2200/';
    const { couchBaseUrl } = await import('./couch.config');
    expect(couchBaseUrl).toEqual('http://localhost:2200');
  });
});
