import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'request': vi.fn(),
  'nano': vi.fn(() => ({ 'request': mocks.request, 'use': vi.fn(() => ({})) }))
}));

vi.mock('nano', () => ({ 'default': mocks.nano }));
vi.mock('dotenv', () => ({ 'default': { 'config': vi.fn() } }));

describe('CouchDB configuration', () => {
  afterEach(() => {
    delete process.env.COUCHDB_HOST;
    delete process.env.COUCHDB_USER;
    delete process.env.COUCHDB_PASS;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('removes embedded credentials from the session-validation base URL', async () => {
    process.env.COUCHDB_HOST = 'http://embedded:secret@localhost:2200/';
    const { couchBaseUrl } = await import('./couch.config');
    expect(couchBaseUrl).toEqual('http://localhost:2200');
  });

  it('limits local resource metadata scans to ChatAPI index state', async () => {
    const { listResourceLocalDocs } = await import('./couch.config');

    listResourceLocalDocs();

    expect(mocks.request).toHaveBeenCalledWith({
      'db': 'resources',
      'path': '_local_docs',
      'qs': {
        'include_docs': true,
        'startkey': '_local/chatapi-resource-index-',
        'endkey': '_local/chatapi-resource-index-\ufff0'
      }
    });
  });

  it('passes cancellation through resource database requests', async () => {
    const controller = new AbortController();
    const { resourceRequest } = await import('./couch.config');

    resourceRequest({ 'doc': 'resource-1', 'signal': controller.signal });

    expect(mocks.request).toHaveBeenCalledWith({
      'db': 'resources',
      'doc': 'resource-1',
      'signal': controller.signal
    });
  });
});
