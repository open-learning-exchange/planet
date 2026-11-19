import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'find': vi.fn(), 'get': vi.fn(), 'insert': vi.fn(), 'list': vi.fn() }));

vi.mock('../../../config/couch.config', () => ({
  'chatDB': mocks,
  'couchBaseUrl': 'http://couchdb:5984',
  'resourceDB': {}
}));

import { chatUsage, conversationChange, getConversation, listConversations, updateConversation } from './history.service';

const amara = { 'name': 'amara', 'roles': [ 'learner' ] };
const brianConversation = {
  '_id': 'chat-1',
  '_rev': '1-a',
  'user': 'brian',
  'title': 'Fractions',
  'createdDate': 1,
  'conversations': [ { 'id': '1', 'query': 'What is a half?', 'response': 'One of two equal parts.' } ]
};

describe('chat history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockResolvedValue({ 'id': 'chat-1', 'rev': '2-b' });
  });

  it('lists every conversation of the session member, page by page', async () => {
    const fullPage = Array.from({ 'length': 1000 }, (value, index) => ({ '_id': `chat-${index}`, 'user': 'amara' }));
    mocks.find
      .mockResolvedValueOnce({ 'docs': fullPage, 'bookmark': 'page-2' })
      .mockResolvedValueOnce({ 'docs': [ { '_id': 'chat-last', 'user': 'amara' } ], 'bookmark': 'page-3' });

    const conversations = await listConversations(amara);

    expect(conversations).toHaveLength(1001);
    expect(mocks.find).toHaveBeenNthCalledWith(1, expect.objectContaining({ 'selector': { 'user': 'amara' } }));
    expect(mocks.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ 'selector': { 'user': 'amara' }, 'bookmark': 'page-2' }));
  });

  it('answers another member\'s conversation as missing and never writes it', async () => {
    mocks.get.mockResolvedValue(brianConversation);

    expect(await getConversation('chat-1', amara)).toBeUndefined();
    expect(await updateConversation('chat-1', amara, { 'title': 'Mine now' })).toBeUndefined();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('renames on top of the stored document and its current revision', async () => {
    mocks.get.mockResolvedValue({ ...brianConversation, 'user': 'amara', 'shared': true });

    const renamed = await updateConversation('chat-1', amara, { 'title': 'Halves' });

    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      '_rev': '1-a',
      'title': 'Halves',
      'shared': true,
      'conversations': brianConversation.conversations
    }));
    expect(renamed?._rev).toEqual('2-b');
  });

  it('changes only the title or the shared flag', () => {
    expect(conversationChange({ 'title': 'Halves', 'user': 'brian' })).toEqual({ 'title': 'Halves' });
    expect(conversationChange({ 'title': '  ' })).toBeUndefined();
    expect(conversationChange({ 'shared': false })).toBeUndefined();
  });

  it('gives managers one row per conversation without the turns', async () => {
    mocks.list.mockResolvedValue({ 'rows': [
      { 'id': '_design/user-index', 'doc': { '_id': '_design/user-index', 'language': 'query' } },
      {
        'id': 'chat-1',
        'doc': { ...brianConversation, 'aiProvider': 'openai', 'context': { 'resource': { 'attachments': { 'a.pdf': {} } } } }
      }
    ] });

    expect(await chatUsage()).toEqual([ {
      '_id': 'chat-1',
      'user': 'brian',
      'createdDate': 1,
      'aiProvider': 'openai',
      'assistant': false,
      'shared': false,
      'turns': 1,
      'hasAttachments': true
    } ]);
  });
});
