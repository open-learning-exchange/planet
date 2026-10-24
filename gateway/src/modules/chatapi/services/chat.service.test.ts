import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'get': vi.fn(),
  'insert': vi.fn(),
  'aiChat': vi.fn()
}));

vi.mock('../../../config/couch.config', () => ({
  'chatDB': { 'get': mocks.get, 'insert': mocks.insert },
  'couchBaseUrl': 'http://couchdb:5984',
  'resourceDB': {}
}));
vi.mock('../utils/chat.utils', () => ({ 'aiChat': mocks.aiChat }));

import { chat, ConversationAccessError } from './chat.service';

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
  });

  it('saves a new conversation under the session member, whatever the body says', async () => {
    await chat({ 'content': 'Hello', 'user': 'brian' }, amara, false);
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ 'user': 'amara' }));
  });

  it('refuses turns on another member\'s conversation and writes nothing', async () => {
    mocks.get.mockResolvedValue(brianConversation);
    await expect(chat({ 'content': 'And a third?', '_id': 'chat-1', 'user': 'brian' }, amara, false))
      .rejects.toBeInstanceOf(ConversationAccessError);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.aiChat).not.toHaveBeenCalled();
  });

  it('refuses a design-document id before reading anything', async () => {
    await expect(chat({ 'content': 'x', '_id': '_design/../chat-1' }, amara, false)).rejects.toBeInstanceOf(ConversationAccessError);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('lets the owner continue', async () => {
    mocks.get.mockResolvedValue({ ...brianConversation, 'user': 'amara' });
    await chat({ 'content': 'And a third?', '_id': 'chat-1' }, amara, false);
    expect(mocks.insert).toHaveBeenLastCalledWith(expect.objectContaining({ '_id': 'chat-1', 'user': 'amara' }));
  });
});
