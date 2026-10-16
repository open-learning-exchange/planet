import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'find': vi.fn() }));

vi.mock('../config/couch.config', () => ({ 'configurationDB': { 'find': mocks.find } }));

const found = (doc?: object) => ({ 'docs': doc ? [ doc ] : [] });

const planetDoc = {
  '_id': 'configuration-1',
  'code': 'planet-1',
  'parentCode': 'earth',
  'keys': { 'openai': 'sk-1', 'currency': 'oxr-1' },
  'models': { 'openai': 'gpt-test' },
  'assistant': { 'name': 'Planet', 'instructions': 'PLANET PROMPT' }
};

const loadService = async () => {
  vi.resetModules();
  return await import('./config.service');
};

describe('configuration service', () => {
  beforeEach(() => {
    mocks.find.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the document the client edits, keeping keys apart from the rest', async () => {
    mocks.find.mockResolvedValue(found(planetDoc));
    const { getConfiguration, getKeys } = await loadService();

    expect(await getConfiguration()).toEqual({
      'code': 'planet-1',
      'parentCode': 'earth',
      'models': { 'openai': 'gpt-test' },
      'assistant': { 'instructions': 'PLANET PROMPT' }
    });
    expect(await getKeys()).toEqual({ 'openai': 'sk-1', 'currency': 'oxr-1' });
    expect(mocks.find).toHaveBeenCalledWith({ 'selector': { '_id': { '$gt': null } }, 'limit': 1 });
  });

  it('keeps the configuration until the gateway restarts', async () => {
    mocks.find
      .mockResolvedValueOnce(found(planetDoc))
      .mockResolvedValueOnce(found({ ...planetDoc, 'keys': { 'openai': 'sk-2' } }));
    const { getKeys } = await loadService();

    expect((await getKeys()).openai).toEqual('sk-1');
    expect((await getKeys()).openai).toEqual('sk-1');
    expect(mocks.find).toHaveBeenCalledTimes(1);
  });

  it('treats a document without AI fields as nothing configured', async () => {
    mocks.find.mockResolvedValue(found({ '_id': 'configuration-1', 'code': 'planet-1', 'keys': { 'openai': null } }));
    const { getConfiguration, getKeys } = await loadService();

    expect(await getKeys()).toEqual({});
    expect((await getConfiguration()).assistant.instructions).toEqual('');
  });

  it('reads again while the planet has no configuration yet, so setup after boot is picked up', async () => {
    mocks.find.mockResolvedValueOnce(found()).mockResolvedValueOnce(found(planetDoc));
    const { getConfiguration } = await loadService();

    expect((await getConfiguration()).code).toEqual('');
    expect((await getConfiguration()).code).toEqual('planet-1');
  });

  it('shares one read between concurrent requests', async () => {
    mocks.find.mockResolvedValue(found(planetDoc));
    const { getConfiguration, getKeys } = await loadService();

    await Promise.all([ getConfiguration(), getKeys(), getConfiguration() ]);

    expect(mocks.find).toHaveBeenCalledTimes(1);
  });

  it('reads the current code and parent for submissions, and answers 503 rather than stamping old ones', async () => {
    mocks.find
      .mockResolvedValueOnce(found(planetDoc))
      .mockResolvedValueOnce(found({ ...planetDoc, 'parentCode': 'new-nation' }))
      .mockRejectedValueOnce(new Error('connection refused'));
    const { getConfiguration, getCurrentConfiguration } = await loadService();

    await getConfiguration();
    expect((await getCurrentConfiguration()).parentCode).toEqual('new-nation');
    await expect(getCurrentConfiguration()).rejects.toMatchObject({ 'statusCode': 503 });
    expect((await getConfiguration()).parentCode).toEqual('earth');
  });

  it('answers 503 until CouchDB answers, as when the gateway starts first', async () => {
    mocks.find.mockRejectedValueOnce(new Error('connection refused')).mockResolvedValueOnce(found(planetDoc));
    const { getKeys } = await loadService();

    await expect(getKeys()).rejects.toMatchObject({ 'statusCode': 503 });
    expect((await getKeys()).openai).toEqual('sk-1');
  });
});
