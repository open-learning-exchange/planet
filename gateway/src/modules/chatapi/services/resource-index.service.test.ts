import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'resourceDB': { 'get': vi.fn(), 'insert': vi.fn(), 'attachment': { 'get': vi.fn() } }
}));

vi.mock('../../../config/couch.config', () => ({ 'resourceDB': mocks.resourceDB }));

import { deleteResourceIndex, ensureResourceIndexed } from './resource-index.service';

const fakeClient = () => ({
  'files': {
    'create': vi.fn().mockResolvedValue({ 'id': 'file_new' }),
    'del': vi.fn().mockResolvedValue({})
  },
  'vectorStores': {
    'create': vi.fn().mockResolvedValue({ 'id': 'vs_new' }),
    'retrieve': vi.fn().mockResolvedValue({ 'id': 'vs_old' }),
    'del': vi.fn().mockResolvedValue({}),
    'files': { 'del': vi.fn().mockResolvedValue({}) },
    'fileBatches': { 'createAndPoll': vi.fn().mockResolvedValue({ 'status': 'completed', 'file_counts': { 'failed': 0 } }) }
  }
});

describe('resource index service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resourceDB.insert.mockResolvedValue({ 'ok': true });
    mocks.resourceDB.attachment.get.mockResolvedValue(Buffer.from('pdf-bytes'));
  });

  it('returns null for resources with no supported attachments', async () => {
    mocks.resourceDB.get.mockResolvedValue({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': { 'video.mp4': { 'content_type': 'video/mp4', 'digest': 'md5-1' } }
    });
    const client: any = fakeClient();
    expect(await ensureResourceIndexed(client, 'res1')).toBeNull();
    expect(client.vectorStores.create).not.toHaveBeenCalled();
  });

  it('indexes supported attachments into a new vector store and persists state', async () => {
    mocks.resourceDB.get.mockResolvedValue({
      '_id': 'res1', '_rev': '1-a',
      '_attachments': {
        'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1' },
        'video.mp4': { 'content_type': 'video/mp4', 'digest': 'md5-2' }
      }
    });
    const client: any = fakeClient();
    const index = await ensureResourceIndexed(client, 'res1');
    expect(index).toEqual({ 'vectorStoreId': 'vs_new', 'indexedFiles': [ 'guide.pdf' ] });
    expect(client.files.create).toHaveBeenCalledTimes(1);
    expect(client.vectorStores.fileBatches.createAndPoll).toHaveBeenCalledWith('vs_new', { 'file_ids': [ 'file_new' ] });
    const savedDoc = mocks.resourceDB.insert.mock.calls[0][0];
    expect(savedDoc.aiVectorStore.id).toEqual('vs_new');
    expect(savedDoc.aiVectorStore.files['guide.pdf']).toMatchObject({ 'fileId': 'file_new', 'digest': 'md5-1' });
  });

  it('is a no-op when digests are unchanged', async () => {
    mocks.resourceDB.get.mockResolvedValue({
      '_id': 'res1', '_rev': '2-b',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1' } },
      'aiVectorStore': { 'id': 'vs_old', 'files': { 'guide.pdf': { 'fileId': 'file_old', 'digest': 'md5-1' } }, 'updatedDate': 1 }
    });
    const client: any = fakeClient();
    const index = await ensureResourceIndexed(client, 'res1');
    expect(index?.vectorStoreId).toEqual('vs_old');
    expect(client.files.create).not.toHaveBeenCalled();
    expect(mocks.resourceDB.insert).not.toHaveBeenCalled();
  });

  it('re-uploads changed attachments and cleans up replaced files', async () => {
    mocks.resourceDB.get.mockResolvedValue({
      '_id': 'res1', '_rev': '3-c',
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-CHANGED' } },
      'aiVectorStore': { 'id': 'vs_old', 'files': { 'guide.pdf': { 'fileId': 'file_old', 'digest': 'md5-1' } }, 'updatedDate': 1 }
    });
    const client: any = fakeClient();
    const index = await ensureResourceIndexed(client, 'res1');
    expect(index?.vectorStoreId).toEqual('vs_old');
    expect(client.files.create).toHaveBeenCalledTimes(1);
    expect(client.vectorStores.files.del).toHaveBeenCalledWith('vs_old', 'file_old');
    expect(client.files.del).toHaveBeenCalledWith('file_old');
  });

  it('refuses to index a private resource for anyone but its owner', async () => {
    mocks.resourceDB.get.mockResolvedValue({
      '_id': 'res1', '_rev': '1-a', 'private': true, 'privateFor': { 'users': 'org.couchdb.user:amara' },
      '_attachments': { 'guide.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-1' } }
    });
    const client: any = fakeClient();
    await expect(ensureResourceIndexed(client, 'res1', 'mallory')).rejects.toMatchObject({ 'statusCode': 403 });
    expect(client.files.create).not.toHaveBeenCalled();
    await expect(ensureResourceIndexed(client, 'res1', 'amara')).resolves.toMatchObject({ 'vectorStoreId': 'vs_new' });
  });

  it('deletes the vector store and files, strips the doc field and returns the new rev', async () => {
    mocks.resourceDB.get.mockResolvedValue({
      '_id': 'res1', '_rev': '4-d', 'title': 'Guide',
      'aiVectorStore': { 'id': 'vs_old', 'files': { 'guide.pdf': { 'fileId': 'file_old', 'digest': 'md5-1' } }, 'updatedDate': 1 }
    });
    mocks.resourceDB.insert.mockResolvedValue({ 'ok': true, 'rev': '5-e' });
    const client: any = fakeClient();
    expect(await deleteResourceIndex(client, 'res1')).toEqual({ 'removed': true, 'rev': '5-e' });
    expect(client.files.del).toHaveBeenCalledWith('file_old');
    expect(client.vectorStores.del).toHaveBeenCalledWith('vs_old');
    expect(mocks.resourceDB.insert.mock.calls[0][0]).not.toHaveProperty('aiVectorStore');
  });

  it('reports nothing removed when there is no index', async () => {
    mocks.resourceDB.get.mockResolvedValue({ '_id': 'res1', '_rev': '1-a' });
    const client: any = fakeClient();
    expect(await deleteResourceIndex(client, 'res1')).toEqual({ 'removed': false });
    expect(mocks.resourceDB.insert).not.toHaveBeenCalled();
  });
});
