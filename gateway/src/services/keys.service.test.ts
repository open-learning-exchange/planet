import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'list': vi.fn(), 'get': vi.fn(), 'insert': vi.fn() }));

vi.mock('../config/couch.config', () => ({ 'keysDB': { 'list': mocks.list, 'get': mocks.get, 'insert': mocks.insert } }));

const rows = (...docs: object[]) => ({ 'rows': docs.map((doc: any) => ({ 'id': doc._id, doc })) });

const aiDoc = { '_id': 'ai', '_rev': '1-a', 'openai': 'sk-1' };

// A one-document CouchDB: a write must carry the current _rev, or it's a 409
const couchWithDoc = (start: object) => {
  let doc: any = { ...start };
  mocks.get.mockImplementation(async () => ({ ...doc }));
  mocks.insert.mockImplementation(async (next: any) => {
    if (next._rev !== doc._rev) {
      throw Object.assign(new Error('conflict'), { 'statusCode': 409 });
    }
    doc = { ...next, '_rev': `${Number.parseInt(doc._rev, 10) + 1}-x` };
    return { 'ok': true };
  });
  return () => doc;
};

const loadService = async () => {
  vi.resetModules();
  return await import('./keys.service');
};

describe('keys service', () => {
  beforeEach(() => {
    mocks.list.mockReset();
    mocks.get.mockReset();
    mocks.insert.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads each service\'s keys from its own document, once', async () => {
    mocks.list.mockResolvedValue(rows(aiDoc, { '_id': 'currency', 'openexchangerates': 'oxr-1' }));
    const { getKeys } = await loadService();

    expect(await getKeys('ai')).toEqual({ 'openai': 'sk-1' });
    expect(await getKeys('currency')).toEqual({ 'openexchangerates': 'oxr-1' });
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it('answers 503 when CouchDB can\'t be read, and reads again next time', async () => {
    mocks.list.mockRejectedValueOnce(new Error('connection refused')).mockResolvedValueOnce(rows(aiDoc));
    const { getKeys } = await loadService();

    await expect(getKeys('ai')).rejects.toMatchObject({ 'statusCode': 503 });
    expect(await getKeys('ai')).toEqual({ 'openai': 'sk-1' });
  });

  it('applies a saved or removed key at once, keeping the service\'s other keys', async () => {
    mocks.list.mockResolvedValue(rows(aiDoc));
    const storedDoc = couchWithDoc(aiDoc);
    const { getKeys, removeKey, setKey } = await loadService();
    await getKeys('ai');

    await setKey('ai', 'gemini', 'gm-1');
    expect(await getKeys('ai')).toEqual({ 'openai': 'sk-1', 'gemini': 'gm-1' });

    await removeKey('ai', 'openai');
    expect(await getKeys('ai')).toEqual({ 'gemini': 'gm-1' });
    expect(storedDoc()).toEqual({ '_id': 'ai', '_rev': '3-x', 'gemini': 'gm-1' });
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });
});
