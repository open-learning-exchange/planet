import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'get': vi.fn(),
  'insert': vi.fn(),
  'aiChat': vi.fn(),
  'providerClient': vi.fn()
}));

vi.mock('../../../config/couch.config', () => ({
  'chatDB': { 'get': mocks.get, 'insert': mocks.insert },
  'couchBaseUrl': 'http://couchdb:5984',
  'resourceDB': {}
}));
vi.mock('../utils/chat.utils', () => ({ 'aiChat': mocks.aiChat }));
vi.mock('../../../services/config.service', () => ({
  'getConfiguration': async () => ({ 'assistant': { 'instructions': '' } })
}));
vi.mock('../providers/clients', () => ({ 'providerClient': mocks.providerClient }));

import { HttpError } from '../../../middleware/errors';
import { chat, chatNoSave } from './chat.service';

const amara = { 'name': 'amara', 'roles': [ 'learner' ] };
const brianConversation = {
  '_id': 'chat-1',
  '_rev': '1-a',
  'user': 'brian',
  'title': 'Fractions',
  'createdDate': 1,
  'aiProvider': 'openai',
  'conversations': [ { 'query': 'What is a half?', 'response': 'One of two equal parts.' } ]
};

describe('chat ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockResolvedValue({ 'id': 'chat-1', 'rev': '2-b' });
    mocks.aiChat.mockResolvedValue('An answer');
    mocks.providerClient.mockResolvedValue({ 'name': 'openai', 'client': {}, 'model': 'model-test' });
  });

  it('saves a new conversation under the session member, whatever the body says', async () => {
    await chat({ 'content': 'Hello', 'user': 'brian' }, amara, false);
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ 'user': 'amara' }));
  });

  it('refuses turns on another member\'s conversation and writes nothing', async () => {
    mocks.get.mockResolvedValue(brianConversation);
    await expect(chat({ 'content': 'And a third?', '_id': 'chat-1', 'user': 'brian' }, amara, false))
      .rejects.toMatchObject({ 'statusCode': 403 });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.aiChat).not.toHaveBeenCalled();
  });

  it('refuses a design-document id before reading anything', async () => {
    await expect(chat({ 'content': 'x', '_id': '_design/../chat-1' }, amara, false)).rejects.toMatchObject({ 'statusCode': 403 });
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('refuses a turn without content, saved or not, before anything else', async () => {
    await expect(chat({ 'aiProvider': { 'name': 'openai' } }, amara, false)).rejects.toMatchObject({ 'statusCode': 400 });
    await expect(chatNoSave(undefined, { 'name': 'openai' })).rejects.toMatchObject({ 'statusCode': 400 });
    expect(mocks.providerClient).not.toHaveBeenCalled();
  });

  it('answers a conversation that no longer exists with 404', async () => {
    mocks.get.mockRejectedValue({ 'statusCode': 404, 'error': 'not_found', 'message': 'deleted' });
    await expect(chat({ 'content': 'Still there?', '_id': 'chat-1' }, amara, false))
      .rejects.toMatchObject({ 'statusCode': 404, 'message': 'Conversation not found' });
  });

  it('refuses a provider that cannot answer before writing anything', async () => {
    mocks.providerClient.mockRejectedValue(new HttpError(400, 'unknown provider'));
    await expect(chat({ 'content': 'Hello', 'aiProvider': { 'name': 'nope' } }, amara, false)).rejects.toMatchObject({ 'statusCode': 400 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('lets the owner continue', async () => {
    mocks.get.mockResolvedValue({ ...brianConversation, 'user': 'amara' });
    await chat({ 'content': 'And a third?', '_id': 'chat-1' }, amara, false);
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ '_id': 'chat-1', 'user': 'amara' }));
  });

  it('stores only the turn\'s fields from the body', async () => {
    await chat({ 'content': 'Hello', 'title': 'Not this', 'shared': true, 'createdDate': 0 }, amara, false);
    const saved = mocks.insert.mock.lastCall?.[0];
    expect(saved).toMatchObject({ 'title': 'Hello' });
    expect(saved).not.toHaveProperty('shared');
    expect(saved.createdDate).toBeGreaterThan(0);
  });

  it('continues from the stored revision and fields, not the body\'s', async () => {
    const sentRevisions: string[] = [];
    mocks.insert.mockImplementation(async (doc) => {
      sentRevisions.push(doc._rev);
      return { 'id': 'chat-1', 'rev': '2-b' };
    });
    mocks.get.mockResolvedValue({ ...brianConversation, 'user': 'amara', 'shared': true, 'context': { 'type': 'coursestep' } });

    await chat({ 'content': 'And a third?', '_id': 'chat-1', '_rev': '0-stale' }, amara, false);

    expect(sentRevisions[0]).toEqual('1-a');
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({
      'shared': true,
      'title': 'Fractions',
      'context': { 'type': 'coursestep' }
    }));
  });
});

describe('chat saving', () => {
  const amaraConversation = { ...brianConversation, 'user': 'amara' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(amaraConversation);
    mocks.insert.mockResolvedValue({ 'id': 'chat-1', 'rev': '2-b' });
    mocks.aiChat.mockResolvedValue('One of three equal parts.');
    mocks.providerClient.mockResolvedValue({ 'name': 'openai', 'client': {}, 'model': 'model-test' });
  });

  it('writes nothing when the provider fails, in a new conversation or an existing one', async () => {
    mocks.aiChat.mockRejectedValue(new HttpError(502, 'The AI provider could not answer'));

    await expect(chat({ 'content': 'Hello' }, amara, false)).rejects.toMatchObject({ 'statusCode': 502 });
    await expect(chat({ 'content': 'And a third?', '_id': 'chat-1' }, amara, false)).rejects.toMatchObject({ 'statusCode': 502 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('replays the whole conversation and saves the answered turn in one write', async () => {
    await chat({ 'content': 'And a third?', '_id': 'chat-1' }, amara, false);

    expect(mocks.aiChat.mock.lastCall?.[0]).toEqual([
      { 'role': 'user', 'content': 'What is a half?' },
      { 'role': 'assistant', 'content': 'One of two equal parts.' },
      { 'role': 'user', 'content': 'And a third?' }
    ]);
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.insert.mock.lastCall?.[0].conversations).toEqual([
      amaraConversation.conversations[0],
      expect.objectContaining({ 'query': 'And a third?', 'response': 'One of three equal parts.' })
    ]);
  });

  it('adds the turn to the newer document when a rename wrote first, without asking the provider again', async () => {
    mocks.get.mockResolvedValueOnce(amaraConversation)
      .mockResolvedValueOnce({ ...amaraConversation, '_rev': '2-renamed', 'title': 'Thirds' });
    mocks.insert.mockRejectedValueOnce({ 'statusCode': 409, 'error': 'conflict' });

    await chat({ 'content': 'And a third?', '_id': 'chat-1' }, amara, false);

    expect(mocks.aiChat).toHaveBeenCalledOnce();
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ '_rev': '2-renamed', 'title': 'Thirds' }));
    expect(mocks.insert.mock.lastCall?.[0].conversations).toHaveLength(2);
  });

  it('refuses turn 41 with its code before asking the provider', async () => {
    mocks.get.mockResolvedValue({ ...amaraConversation, 'conversations': Array(40).fill(amaraConversation.conversations[0]) });

    await expect(chat({ 'content': 'One more?', '_id': 'chat-1' }, amara, false))
      .rejects.toMatchObject({ 'statusCode': 409, 'code': 'conversation_turn_limit' });
    expect(mocks.aiChat).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('records the provider that answered, which may not be the one the conversation started with', async () => {
    mocks.providerClient.mockResolvedValue({ 'name': 'deepseek', 'client': {}, 'model': 'model-test' });

    await chat({ 'content': 'And a third?', '_id': 'chat-1', 'aiProvider': { 'name': 'deepseek' } }, amara, false);

    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ 'aiProvider': 'deepseek' }));
  });

  it('titles a new conversation with at most 60 characters of its first message, never half an emoji', async () => {
    await chat({ 'content': `${'a'.repeat(58)}😀 and what comes after` }, amara, false);

    expect(mocks.insert.mock.lastCall?.[0].title).toEqual(`${'a'.repeat(58)}😀…`);
  });
});
