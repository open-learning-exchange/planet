import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'resourceDB': { 'get': vi.fn(), 'insert': vi.fn(), 'destroy': vi.fn(), 'attachment': { 'get': vi.fn() } },
  'requestResourceDatabase': vi.fn(),
  'listResourceLocalDocs': vi.fn(),
  'getAIConfig': vi.fn(),
  'resourceIndexStatePrefix': '_local/chatapi-resource-index-'
}));

vi.mock('../../../config/couch.config', () => ({
  'listResourceLocalDocs': mocks.listResourceLocalDocs,
  'requestResourceDatabase': mocks.requestResourceDatabase,
  'resourceDB': mocks.resourceDB,
  'RESOURCE_INDEX_STATE_PREFIX': mocks.resourceIndexStatePrefix
}));
vi.mock('./config.service', () => ({ 'getAIConfig': mocks.getAIConfig }));

import {
  deleteResourceIndex,
  ensureResourceIndexed,
  markResourceIndexDirtyIfUnavailable,
  reconcileOrphanedResourceIndexes,
  resourceHasSupportedAttachments,
  resetResourceIndexLocks,
  startResourceIndexReconciliation
} from './resource-index.service';

const notFound = () => Object.assign(new Error('missing'), { 'statusCode': 404 });
const oldStore = (): any => ({
  'id': 'vs_old',
  'files': { 'guide.pdf': { 'fileId': 'file_old', 'digest': 'md5-1' } }
});
const localState = (store: any = oldStore()) => ({
  '_id': '_local/saved-index', '_rev': '0-1', 'resourceId': 'res1', store
});
const setDocs = (resource: any, state?: any) => {
  mocks.resourceDB.get.mockImplementation((id: string) => id.startsWith('_local/')
    ? state ? Promise.resolve(state) : Promise.reject(notFound())
    : Promise.resolve(resource));
};
const fakeClient = () => ({
  'files': {
    'create': vi.fn().mockResolvedValue({ 'id': 'file_new' }),
    'del': vi.fn().mockResolvedValue({})
  },
  'vectorStores': {
    'create': vi.fn().mockResolvedValue({ 'id': 'vs_new' }),
    'retrieve': vi.fn().mockResolvedValue({ 'id': 'vs_old', 'status': 'completed' }),
    'del': vi.fn().mockResolvedValue({}),
    'fileBatches': {
      'create': vi.fn().mockResolvedValue({ 'id': 'batch_new', 'status': 'completed', 'file_counts': { 'failed': 0 } }),
      'retrieve': vi.fn().mockResolvedValue({ 'id': 'batch_new', 'status': 'completed', 'file_counts': { 'failed': 0 } })
    }
  }
});

describe('resource index service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestResourceDatabase.mockImplementation((options: any) => {
      if (options.att) {
        return mocks.resourceDB.attachment.get(options.doc, options.att);
      }
      if (options.method === 'PUT') {
        return mocks.resourceDB.insert(options.body, options.doc);
      }
      if (options.method === 'DELETE') {
        return mocks.resourceDB.destroy(options.doc, options.qs?.rev);
      }
      return mocks.resourceDB.get(options.doc);
    });
    mocks.resourceDB.insert.mockResolvedValue({ 'ok': true, 'rev': '0-2' });
    mocks.resourceDB.destroy.mockResolvedValue({ 'ok': true });
    mocks.resourceDB.attachment.get.mockResolvedValue(Buffer.from('pdf-bytes'));
    mocks.listResourceLocalDocs.mockResolvedValue({ 'rows': [] });
    mocks.getAIConfig.mockResolvedValue({ 'planetCode': 'planet-a' });
  });

  afterEach(() => {
    resetResourceIndexLocks();
    delete process.env.RESOURCE_INDEX_MAX_FILE_BYTES;
    delete process.env.RESOURCE_INDEX_MAX_TOTAL_BYTES;
    delete process.env.RESOURCE_INDEX_MAX_FILES;
    delete process.env.RESOURCE_INDEX_TIMEOUT_MS;
    delete process.env.RESOURCE_INDEX_RECONCILIATION_START_DELAY_MS;
    vi.useRealTimers();
  });

  it('returns null without creating local state when no supported attachment or index exists', async () => {
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'video.mp4': { 'content_type': 'video/mp4', 'digest': 'md5-1', 'length': 10 } }
    });
    const client: any = fakeClient();
    expect(await ensureResourceIndexed(client, 'res1')).toBeNull();
    expect(client.vectorStores.create).not.toHaveBeenCalled();
    expect(mocks.resourceDB.destroy).not.toHaveBeenCalled();
  });

  it('reads supported attachment types from CouchDB case-insensitively', async () => {
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'guide.pdf': { 'content_type': 'Application/PDF; charset=binary' } }
    });
    await expect(resourceHasSupportedAttachments('res1', 'amara')).resolves.toEqual(true);

    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'video.mp4': { 'content_type': 'video/mp4' } }
    });
    await expect(resourceHasSupportedAttachments('res1', 'amara')).resolves.toEqual(false);
  });

  it('applies resource privacy checks while inspecting authoritative attachments', async () => {
    setDocs({
      '_id': 'res1', '_rev': '1-a', 'private': true,
      'privateFor': { 'users': 'org.couchdb.user:bakari' },
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf' } }
    });

    await expect(resourceHasSupportedAttachments('res1', 'amara')).rejects.toMatchObject({ 'statusCode': 403 });
  });

  it('indexes supported attachments and persists only deployment-local state', async () => {
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': {
        'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 },
        'video.mp4': { 'content_type': 'video/mp4', 'digest': 'md5-2', 'length': 9 }
      }
    });
    const client: any = fakeClient();
    const index = await ensureResourceIndexed(client, 'res1');
    expect(index).toEqual({
      'vectorStoreId': 'vs_new',
      'fileNamesById': { 'file_new': 'guide.pdf' }
    });
    const [ savedDoc, savedId ] = mocks.resourceDB.insert.mock.calls[0];
    expect(savedId).toMatch(/^_local\/chatapi-resource-index-/);
    expect(savedDoc).toMatchObject({ '_id': savedId, 'resourceId': 'res1', 'store': { 'id': 'vs_new' } });
    expect(savedDoc).not.toHaveProperty('aiVectorStore');
  });

  it('is a no-op when deployment-local digests are unchanged', async () => {
    setDocs({
      '_id': 'res1', '_rev': '2-b',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    }, localState());
    const client: any = fakeClient();
    const index = await ensureResourceIndexed(client, 'res1');
    expect(index).toMatchObject({ 'vectorStoreId': 'vs_old', 'fileNamesById': { 'file_old': 'guide.pdf' } });
    expect(client.files.create).not.toHaveBeenCalled();
    expect(mocks.resourceDB.insert).not.toHaveBeenCalled();
  });

  it('rebuilds the index when attachment digests change', async () => {
    setDocs({
      '_id': 'res1', '_rev': '3-c',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-CHANGED', 'length': 9 } }
    }, localState());
    const client: any = fakeClient();
    expect(await ensureResourceIndexed(client, 'res1')).toMatchObject({ 'vectorStoreId': 'vs_new' });
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old', { 'signal': expect.any(AbortSignal) });
    expect(client.files.del).toHaveBeenCalledWith('file_old', { 'signal': expect.any(AbortSignal) });
    expect(mocks.resourceDB.insert.mock.calls[0][0]).toMatchObject({ 'store': { 'id': 'vs_old', 'dirty': true } });
    expect(mocks.resourceDB.destroy).toHaveBeenCalledWith('_local/saved-index', '0-2');
    expect(mocks.resourceDB.insert.mock.calls.at(-1)?.[0]).toMatchObject({
      'store': { 'id': 'vs_new', 'files': { 'guide.pdf': { 'fileId': 'file_new' } } }
    });
  });

  it('serializes concurrent index creation so only one remote store is created', async () => {
    const resource = {
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    };
    let state: any;
    mocks.resourceDB.get.mockImplementation((id: string) => id.startsWith('_local/')
      ? state ? Promise.resolve(state) : Promise.reject(notFound())
      : Promise.resolve(resource));
    mocks.resourceDB.insert.mockImplementation((doc: any) => {
      state = { ...doc, '_rev': '0-1' };
      return Promise.resolve({ 'ok': true, 'rev': '0-1' });
    });
    let releaseCreation: ((value: { id: string }) => void) | undefined;
    const creation = new Promise<{ id: string }>((resolve) => {
      releaseCreation = resolve;
    });
    const client: any = fakeClient();
    client.vectorStores.create.mockReturnValue(creation);

    const first = ensureResourceIndexed(client, 'res1');
    const second = ensureResourceIndexed(client, 'res1');
    await vi.waitFor(() => expect(client.vectorStores.create).toHaveBeenCalledTimes(1));
    if (!releaseCreation) {
      throw new Error('vector-store creation was not started');
    }
    releaseCreation({ 'id': 'vs_new' });

    await expect(Promise.all([ first, second ])).resolves.toEqual([
      expect.objectContaining({ 'vectorStoreId': 'vs_new' }),
      expect.objectContaining({ 'vectorStoreId': 'vs_new' })
    ]);
    expect(client.vectorStores.create).toHaveBeenCalledTimes(1);
    expect(client.files.create).toHaveBeenCalledTimes(1);
    expect(mocks.resourceDB.insert).toHaveBeenCalledTimes(1);
  });

  it('serializes deletion behind an in-flight index creation', async () => {
    const resource = {
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    };
    let state: any;
    mocks.resourceDB.get.mockImplementation((id: string) => id.startsWith('_local/')
      ? state ? Promise.resolve(state) : Promise.reject(notFound())
      : Promise.resolve(resource));
    mocks.resourceDB.insert.mockImplementation((doc: any) => {
      state = { ...doc, '_rev': '0-1' };
      return Promise.resolve({ 'ok': true, 'rev': '0-1' });
    });
    mocks.resourceDB.destroy.mockImplementation(() => {
      state = undefined;
      return Promise.resolve({ 'ok': true });
    });
    let releaseCreation: ((value: { id: string }) => void) | undefined;
    const creation = new Promise<{ id: string }>((resolve) => {
      releaseCreation = resolve;
    });
    const client: any = fakeClient();
    client.vectorStores.create.mockReturnValue(creation);
    const getClient = vi.fn(async () => client);

    const indexing = ensureResourceIndexed(client, 'res1');
    await vi.waitFor(() => expect(client.vectorStores.create).toHaveBeenCalledTimes(1));
    const deleting = deleteResourceIndex(getClient, 'res1', { 'name': 'manager', 'roles': [ 'manager' ] });
    expect(getClient).not.toHaveBeenCalled();
    if (!releaseCreation) {
      throw new Error('vector-store creation was not started');
    }
    releaseCreation({ 'id': 'vs_new' });

    await expect(indexing).resolves.toMatchObject({ 'vectorStoreId': 'vs_new' });
    await expect(deleting).resolves.toEqual({ 'removed': true });
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_new');
    expect(mocks.resourceDB.destroy).toHaveBeenCalled();
  });

  it('rolls back instead of persisting a partial index when the batch fails', async () => {
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    });
    const client: any = fakeClient();
    client.vectorStores.fileBatches.create.mockResolvedValue({
      'id': 'batch_new', 'status': 'completed', 'file_counts': { 'failed': 1 }
    });
    await expect(ensureResourceIndexed(client, 'res1')).rejects.toMatchObject({ 'statusCode': 502 });
    expect(client.files.del).toHaveBeenCalledWith('file_new', { 'signal': expect.any(AbortSignal) });
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_new', { 'signal': expect.any(AbortSignal) });
    expect(mocks.resourceDB.insert).not.toHaveBeenCalled();
  });

  it('retains dirty build IDs when rollback cleanup fails', async () => {
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    });
    const client: any = fakeClient();
    client.vectorStores.fileBatches.create.mockResolvedValue({
      'id': 'batch_new', 'status': 'failed', 'file_counts': { 'failed': 1 }
    });
    client.vectorStores.del.mockRejectedValue(Object.assign(new Error('server error'), { 'status': 500 }));

    await expect(ensureResourceIndexed(client, 'res1')).rejects.toMatchObject({ 'statusCode': 502 });

    expect(mocks.resourceDB.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        'resourceId': 'res1',
        'store': expect.objectContaining({
          'id': 'vs_new',
          'dirty': true,
          'files': { 'guide.pdf': { 'fileId': 'file_new', 'digest': 'md5-1' } }
        })
      }),
      expect.stringMatching(/^_local\/chatapi-resource-index-/)
    );
  });

  it('bounds file-batch polling with the configured indexing timeout', async () => {
    process.env.RESOURCE_INDEX_TIMEOUT_MS = '20';
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    });
    const client: any = fakeClient();
    client.vectorStores.fileBatches.create.mockResolvedValue({
      'id': 'batch_new', 'status': 'in_progress', 'file_counts': { 'failed': 0 }
    });

    await expect(ensureResourceIndexed(client, 'res1')).rejects.toMatchObject({
      'statusCode': 504,
      'message': 'Resource indexing timed out'
    });
    expect(client.vectorStores.fileBatches.create.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
    expect(client.vectorStores.fileBatches.retrieve).not.toHaveBeenCalled();
  });

  it('cancels a stalled CouchDB read at the indexing deadline', async () => {
    process.env.RESOURCE_INDEX_TIMEOUT_MS = '20';
    mocks.requestResourceDatabase.mockImplementation((options: { signal: AbortSignal }) => new Promise((resolve, reject) => {
      void resolve;
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { 'once': true });
    }));

    await expect(ensureResourceIndexed(fakeClient() as any, 'res1')).rejects.toMatchObject({
      'statusCode': 504,
      'message': 'Resource indexing timed out'
    });
    expect(mocks.requestResourceDatabase.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
  });

  it('cleans up local and remote state when eligible attachments are gone', async () => {
    setDocs({ '_id': 'res1', '_rev': '5-e' }, localState());
    const client: any = fakeClient();
    expect(await ensureResourceIndexed(client, 'res1')).toBeNull();
    expect(client.files.del).toHaveBeenCalledWith('file_old', { 'signal': expect.any(AbortSignal) });
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old', { 'signal': expect.any(AbortSignal) });
    expect(mocks.resourceDB.destroy).toHaveBeenCalledWith('_local/saved-index', '0-2');
  });

  it('refuses to index a private resource for anyone but its owner', async () => {
    setDocs({
      '_id': 'res1', '_rev': '1-a', 'private': true, 'privateFor': { 'users': 'org.couchdb.user:amara' },
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    });
    const client: any = fakeClient();
    await expect(ensureResourceIndexed(client, 'res1', 'mallory')).rejects.toMatchObject({ 'statusCode': 403 });
    await expect(ensureResourceIndexed(client, 'res1', 'amara')).resolves.toMatchObject({ 'vectorStoreId': 'vs_new' });
  });

  it('rejects oversized individual and aggregate attachment metadata before downloading', async () => {
    process.env.RESOURCE_INDEX_MAX_FILE_BYTES = '10';
    process.env.RESOURCE_INDEX_MAX_TOTAL_BYTES = '15';
    const client: any = fakeClient();
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'large.pdf': { 'content_type': 'application/pdf', 'digest': 'a', 'length': 11 } }
    });
    await expect(ensureResourceIndexed(client, 'res1')).rejects.toMatchObject({ 'statusCode': 413 });
    setDocs({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': {
        'a.pdf': { 'content_type': 'application/pdf', 'digest': 'a', 'length': 8 },
        'b.pdf': { 'content_type': 'application/pdf', 'digest': 'b', 'length': 8 }
      }
    });
    await expect(ensureResourceIndexed(client, 'res1')).rejects.toMatchObject({ 'statusCode': 413 });
    expect(mocks.resourceDB.attachment.get).not.toHaveBeenCalled();
  });

  it('rejects more than 50 searchable attachments before uploading', async () => {
    const attachments = Object.fromEntries(Array.from(Array(51).keys(), (index) => [
      `guide-${index}.pdf`,
      { 'content_type': 'application/pdf', 'digest': `md5-${index}`, 'length': 1 }
    ]));
    setDocs({ '_id': 'res1', '_rev': '1-a', '_attachments': attachments });
    const client: any = fakeClient();

    await expect(ensureResourceIndexed(client, 'res1')).rejects.toMatchObject({ 'statusCode': 413 });
    expect(client.vectorStores.create).not.toHaveBeenCalled();
    expect(client.files.create).not.toHaveBeenCalled();
  });

  it('deletes remote objects and the local state without revising the resource', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d', 'title': 'Guide' }, localState());
    const client: any = fakeClient();
    expect(await deleteResourceIndex(async () => client, 'res1')).toEqual({ 'removed': true });
    expect(client.files.del).toHaveBeenCalledWith('file_old');
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old');
    expect(mocks.resourceDB.destroy).toHaveBeenCalledWith('_local/saved-index', '0-2');
    expect(mocks.resourceDB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ 'store': expect.objectContaining({ 'dirty': true }) }),
      '_local/saved-index'
    );
    expect(mocks.resourceDB.get).not.toHaveBeenCalledWith('res1');
  });

  it('reports nothing removed when there is no local index', async () => {
    setDocs({ '_id': 'res1', '_rev': '1-a' });
    const getClient = vi.fn(async () => fakeClient() as any);
    expect(await deleteResourceIndex(getClient, 'res1')).toEqual({ 'removed': false });
    expect(getClient).not.toHaveBeenCalled();
    expect(mocks.resourceDB.destroy).not.toHaveBeenCalled();
  });

  it('allows only resource-index administrators to clean retained state after the resource document is gone', async () => {
    mocks.resourceDB.get.mockImplementation((id: string) => id.startsWith('_local/')
      ? Promise.resolve(localState())
      : Promise.reject(notFound()));
    const client: any = fakeClient();

    await expect(deleteResourceIndex(async () => client, 'res1', { 'name': 'amara', 'roles': [ 'learner' ] }))
      .rejects.toMatchObject({ 'statusCode': 403 });
    await expect(deleteResourceIndex(async () => client, 'res1', { 'name': 'manager', 'roles': [ 'manager' ] }))
      .resolves.toEqual({ 'removed': true });
    await expect(deleteResourceIndex(async () => client, 'res1', { 'name': 'admin', 'roles': [ '_admin' ] }))
      .resolves.toEqual({ 'removed': true });
  });

  it('lets managers and the local owner remove an index, but nobody else', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d', 'addedBy': 'amara', 'sourcePlanet': 'planet-a' }, localState());
    const client: any = fakeClient();
    await expect(deleteResourceIndex(async () => client, 'res1', { 'name': 'bakari', 'roles': [ 'learner' ] }))
      .rejects.toMatchObject({ 'statusCode': 403 });
    await expect(deleteResourceIndex(async () => client, 'res1', { 'name': 'amara', 'roles': [ 'learner' ] }))
      .resolves.toEqual({ 'removed': true });
    await expect(deleteResourceIndex(async () => client, 'res1', { 'name': 'bakari', 'roles': [ 'manager' ] }))
      .resolves.toEqual({ 'removed': true });
  });

  it('does not treat a same-name author of a synced resource as the owner', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d', 'addedBy': 'amara', 'sourcePlanet': 'planet-b' }, localState());
    await expect(deleteResourceIndex(async () => fakeClient() as any, 'res1', { 'name': 'amara', 'roles': [ 'learner' ] }))
      .rejects.toMatchObject({ 'statusCode': 403 });
  });

  it('fails closed for owner cleanup when the local Planet code is unavailable', async () => {
    mocks.getAIConfig.mockResolvedValue({ 'planetCode': '' });
    setDocs({ '_id': 'res1', '_rev': '4-d', 'addedBy': 'amara', 'sourcePlanet': 'planet-a' }, localState());
    await expect(deleteResourceIndex(async () => fakeClient() as any, 'res1', { 'name': 'amara', 'roles': [ 'learner' ] }))
      .rejects.toMatchObject({ 'statusCode': 403 });
  });

  it('keeps local state when OpenAI cleanup fails transiently', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState());
    const client: any = fakeClient();
    client.files.del.mockRejectedValue(Object.assign(new Error('server error'), { 'status': 500 }));
    await expect(deleteResourceIndex(async () => client, 'res1')).rejects.toMatchObject({ 'statusCode': 502 });
    expect(mocks.resourceDB.destroy).not.toHaveBeenCalled();
    expect(mocks.resourceDB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ 'store': expect.objectContaining({ 'dirty': true }) }),
      '_local/saved-index'
    );
  });

  it('retains dirty state after partial multi-file cleanup so it can be retried', async () => {
    const state = localState({
      'id': 'vs_old',
        'files': {
          'a.pdf': { 'fileId': 'file_a', 'digest': 'a' },
          'b.pdf': { 'fileId': 'file_b', 'digest': 'b' },
          'c.pdf': { 'fileId': 'file_c', 'digest': 'c' }
        }
    });
    setDocs({ '_id': 'res1', '_rev': '4-d' }, state);
    const client: any = fakeClient();
    client.files.del.mockImplementation((fileId: string) => fileId === 'file_b'
      ? Promise.reject(Object.assign(new Error('server error'), { 'status': 500 }))
      : Promise.resolve({}));

    await expect(deleteResourceIndex(async () => client, 'res1')).rejects.toMatchObject({ 'statusCode': 502 });

    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old');
    expect(client.files.del).toHaveBeenCalledTimes(3);
    expect(client.files.del).toHaveBeenCalledWith('file_c');
    expect(mocks.resourceDB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ 'store': expect.objectContaining({ 'dirty': true }) }),
      '_local/saved-index'
    );
    expect(mocks.resourceDB.destroy).not.toHaveBeenCalled();
  });

  it('aborts remote cleanup while retaining dirty state for reconciliation', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState());
    const client: any = fakeClient();
    client.vectorStores.del.mockImplementation((id: string, options: { signal: AbortSignal }) => {
      void id;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { 'once': true });
      });
    });
    const controller = new AbortController();

    const pending = deleteResourceIndex(async () => client, 'res1', undefined, controller.signal);
    await vi.waitFor(() => expect(client.vectorStores.del).toHaveBeenCalled());
    controller.abort(new Error('cleanup deadline reached'));

    await expect(pending).rejects.toThrow('cleanup deadline reached');
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old', { 'signal': controller.signal });
    expect(mocks.resourceDB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ 'store': expect.objectContaining({ 'dirty': true }) }),
      '_local/saved-index'
    );
    expect(mocks.resourceDB.destroy).not.toHaveBeenCalled();
  });

  it('does not wait past cancellation while another operation holds the resource lock', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState());
    const client: any = fakeClient();
    let releaseDelete: () => void = () => undefined;
    client.vectorStores.del.mockImplementationOnce(() => new Promise((resolve) => {
      releaseDelete = () => resolve({});
    }));
    const first = deleteResourceIndex(async () => client, 'res1');
    await vi.waitFor(() => expect(client.vectorStores.del).toHaveBeenCalled());
    const controller = new AbortController();
    const queued = deleteResourceIndex(async () => client, 'res1', undefined, controller.signal);

    controller.abort(new Error('cleanup deadline reached'));

    await expect(queued).rejects.toThrow('cleanup deadline reached');
    const third = deleteResourceIndex(async () => client, 'res1');
    expect(client.vectorStores.del).toHaveBeenCalledTimes(1);
    releaseDelete();
    await expect(first).resolves.toEqual({ 'removed': true });
    await expect(third).resolves.toEqual({ 'removed': true });
  });

  it('rebuilds rather than trusting a dirty saved index', async () => {
    setDocs({
      '_id': 'res1', '_rev': '2-b',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1', 'length': 9 } }
    }, localState({ ...oldStore(), 'dirty': true }));
    const client: any = fakeClient();

    const index = await ensureResourceIndexed(client, 'res1');

    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old', { 'signal': expect.any(AbortSignal) });
    expect(index?.vectorStoreId).toEqual('vs_new');
  });

  it('marks a saved index dirty when its remote store is missing', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState());
    const client: any = fakeClient();
    client.vectorStores.retrieve.mockRejectedValue(notFound());

    await markResourceIndexDirtyIfUnavailable(client, 'res1', 'vs_old');

    expect(mocks.resourceDB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ 'store': expect.objectContaining({ 'dirty': true }) }),
      '_local/saved-index'
    );
  });

  it('marks a saved index dirty when its remote store has expired', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState());
    const client: any = fakeClient();
    client.vectorStores.retrieve.mockResolvedValue({ 'id': 'vs_old', 'status': 'expired' });

    await markResourceIndexDirtyIfUnavailable(client, 'res1', 'vs_old');

    expect(mocks.resourceDB.insert).toHaveBeenCalledWith(
      expect.objectContaining({ 'store': expect.objectContaining({ 'dirty': true }) }),
      '_local/saved-index'
    );
  });

  it('keeps a healthy saved index clean after an unrelated provider failure', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState());
    const client: any = fakeClient();

    await markResourceIndexDirtyIfUnavailable(client, 'res1', 'vs_old');

    expect(mocks.resourceDB.insert).not.toHaveBeenCalled();
  });

  it('does not dirty an index that was replaced before the recovery check', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState({ ...oldStore(), 'id': 'vs_newer' }));
    const client: any = fakeClient();

    await markResourceIndexDirtyIfUnavailable(client, 'res1', 'vs_old');

    expect(client.vectorStores.retrieve).not.toHaveBeenCalled();
    expect(mocks.resourceDB.insert).not.toHaveBeenCalled();
  });

  it('reconciles retained index state after its resource has been deleted', async () => {
    const state = {
      ...localState(),
      '_id': '_local/chatapi-resource-index-orphan'
    };
    mocks.listResourceLocalDocs.mockResolvedValue({ 'rows': [ { 'doc': state } ] });
    mocks.resourceDB.get.mockImplementation((id: string) => id.startsWith('_local/')
      ? Promise.resolve(state)
      : Promise.reject(notFound()));
    const client: any = fakeClient();
    const getClient = vi.fn(async () => client);

    await reconcileOrphanedResourceIndexes(getClient);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old');
    expect(mocks.resourceDB.destroy).toHaveBeenCalled();
  });

  it('does not load OpenAI while reconciling index state for a live resource', async () => {
    const state = {
      ...localState(),
      '_id': '_local/chatapi-resource-index-live'
    };
    mocks.listResourceLocalDocs.mockResolvedValue({ 'rows': [ { 'doc': state } ] });
    mocks.resourceDB.get.mockImplementation((id: string) => id.startsWith('_local/')
      ? Promise.resolve(state)
      : Promise.resolve({ '_id': 'res1', '_rev': '1-a' }));
    const getClient = vi.fn(async () => fakeClient() as any);

    await reconcileOrphanedResourceIndexes(getClient);
    expect(getClient).not.toHaveBeenCalled();
  });

  it('reconciles dirty index state even while the resource still exists', async () => {
    const state = {
      ...localState({ ...oldStore(), 'dirty': true }),
      '_id': '_local/chatapi-resource-index-dirty'
    };
    mocks.listResourceLocalDocs.mockResolvedValue({ 'rows': [ { 'doc': state } ] });
    mocks.resourceDB.get.mockResolvedValue(state);
    const client: any = fakeClient();
    const getClient = vi.fn(async () => client);

    await reconcileOrphanedResourceIndexes(getClient);

    expect(getClient).toHaveBeenCalledTimes(1);
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old');
    expect(mocks.resourceDB.destroy).toHaveBeenCalled();
  });

  it('redacts deferred cleanup errors from reconciliation logs', async () => {
    const state = {
      ...localState(),
      '_id': '_local/chatapi-resource-index-orphan'
    };
    mocks.listResourceLocalDocs.mockResolvedValue({ 'rows': [ { 'doc': state } ] });
    mocks.resourceDB.get.mockImplementation((id: string) => id.startsWith('_local/')
      ? Promise.resolve(state)
      : Promise.reject(notFound()));
    mocks.resourceDB.insert.mockRejectedValue(Object.assign(new Error('secret provider response'), {
      'status': 503,
      'request_id': 'req-safe-context'
    }));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await reconcileOrphanedResourceIndexes(async () => fakeClient() as any);

    const messages = log.mock.calls.map(([ message ]) => String(message));
    expect(messages.join('\n')).not.toContain('secret provider response');
    expect(messages).toContain(
      'chatapi: deferred index cleanup failed for resource res1 (status 503), request req-safe-context'
    );
    log.mockRestore();
  });

  it('skips the production reconciliation scan when OpenAI is not configured', async () => {
    vi.useFakeTimers();
    process.env.RESOURCE_INDEX_RECONCILIATION_START_DELAY_MS = '1';
    mocks.resourceDB.get.mockRejectedValue(notFound());
    mocks.getAIConfig.mockResolvedValue({ 'providers': { 'openai': { 'fileSearchClient': undefined } } });

    const stop = startResourceIndexReconciliation();
    expect(mocks.getAIConfig).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => expect(mocks.getAIConfig).toHaveBeenCalled());

    expect(mocks.listResourceLocalDocs).not.toHaveBeenCalled();
    stop();
  });

  it('persists a successful reconciliation time and skips another boot-time scan until it is due', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T12:00:00Z'));
    process.env.RESOURCE_INDEX_RECONCILIATION_START_DELAY_MS = '1';
    const client = fakeClient();
    mocks.resourceDB.get.mockRejectedValue(notFound());
    mocks.getAIConfig.mockResolvedValue({ 'providers': { 'openai': { 'fileSearchClient': client } } });

    let stop = startResourceIndexReconciliation();
    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => expect(mocks.resourceDB.insert).toHaveBeenCalled());
    const savedReconciliation = mocks.resourceDB.insert.mock.calls[0][0];
    expect(savedReconciliation).toEqual(expect.objectContaining({
      '_id': '_local/chatapi-resource-index-reconciliation',
      'lastSuccessfulRun': expect.any(Number)
    }));
    stop();

    vi.clearAllMocks();
    mocks.resourceDB.get.mockResolvedValue({
      '_id': '_local/chatapi-resource-index-reconciliation',
      '_rev': '0-1',
      'lastSuccessfulRun': savedReconciliation.lastSuccessfulRun
    });
    stop = startResourceIndexReconciliation();
    await vi.advanceTimersByTimeAsync(1);

    expect(mocks.getAIConfig).not.toHaveBeenCalled();
    expect(mocks.listResourceLocalDocs).not.toHaveBeenCalled();
    stop();
  });

  it('treats already-deleted OpenAI objects as successful cleanup', async () => {
    setDocs({ '_id': 'res1', '_rev': '4-d' }, localState());
    const client: any = fakeClient();
    client.files.del.mockRejectedValue(Object.assign(new Error('gone'), { 'status': 404 }));
    client.vectorStores.del.mockRejectedValue(Object.assign(new Error('gone'), { 'status': 404 }));
    await expect(deleteResourceIndex(async () => client, 'res1')).resolves.toEqual({ 'removed': true });
    expect(mocks.resourceDB.destroy).toHaveBeenCalled();
  });
});
