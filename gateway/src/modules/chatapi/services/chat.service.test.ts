import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'chatDB': { 'get': vi.fn(), 'insert': vi.fn() },
  'getAIConfig': vi.fn(),
  'runProviderChat': vi.fn(),
  'ensureResourceIndexed': vi.fn()
}));

vi.mock('../../../config/couch.config', () => ({ 'chatDB': mocks.chatDB }));
vi.mock('./config.service', () => ({ 'getAIConfig': mocks.getAIConfig }));
vi.mock('./resource-index.service', () => ({ 'ensureResourceIndexed': mocks.ensureResourceIndexed }));
vi.mock('../providers', () => ({ 'runProviderChat': mocks.runProviderChat }));

import { chat } from './chat.service';

const runtime = (name: string, enabled = true) =>
  ({ name, enabled, 'client': enabled ? {} : undefined, 'defaultModel': `${name}-default-model` });

const config = () => ({
  'providers': {
    'openai': runtime('openai'),
    'perplexity': runtime('perplexity'),
    'deepseek': runtime('deepseek', false),
    'gemini': runtime('gemini', false)
  },
  'promptProfiles': {
    'general_chat': 'GENERAL PROFILE',
    'course_help': 'COURSE PROFILE',
    'survey_analysis': 'SURVEY PROFILE'
  },
  'streaming': false
});

describe('chat service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAIConfig.mockResolvedValue(config());
    mocks.runProviderChat.mockResolvedValue({ 'text': 'the answer', 'responseId': 'resp_1', 'citations': [] });
    mocks.chatDB.insert.mockResolvedValue({ 'ok': true, 'id': 'doc1', 'rev': '1-a' });
  });

  it('rejects a missing or empty content field', async () => {
    await expect(chat({ 'content': '' }, { 'save': false })).rejects.toMatchObject({ 'statusCode': 400 });
    await expect(chat({ 'content': 42 as unknown as string }, { 'save': false })).rejects.toMatchObject({ 'statusCode': 400 });
  });

  it('returns a completion without saving when save is false', async () => {
    const outcome = await chat({ 'content': 'hello' }, { 'save': false });
    expect(outcome.completionText).toEqual('the answer');
    expect(mocks.chatDB.insert).not.toHaveBeenCalled();
  });

  it('persists a whitelisted doc for a new conversation', async () => {
    const longContent = 'x'.repeat(80);
    await chat(
      { 'content': longContent, 'user': 'amara', 'context': { 'type': 'coursestep', 'data': 'step info' }, 'assistant': true } as any,
      { 'save': true }
    );
    const doc = mocks.chatDB.insert.mock.calls[0][0];
    expect(doc.user).toEqual('amara');
    expect(doc.title.length).toBeLessThanOrEqual(60);
    expect(doc.aiProvider).toEqual('openai');
    expect(doc.conversations).toHaveLength(1);
    expect(doc.conversations[0]).toMatchObject({ 'query': longContent, 'response': 'the answer' });
    expect(doc.lastResponseId).toEqual('resp_1');
    expect(doc).not.toHaveProperty('context');
    expect(doc).not.toHaveProperty('assistant');
  });

  it('persists the resolved mode so the client can partition chat history', async () => {
    await chat({ 'content': 'hi', 'mode': 'course_help' }, { 'save': true });
    expect(mocks.chatDB.insert.mock.calls[0][0].mode).toEqual('course_help');
    await chat({ 'content': 'hi' }, { 'save': true });
    expect(mocks.chatDB.insert.mock.calls[1][0].mode).toEqual('general_chat');
  });

  it('prefers the session user over the payload user', async () => {
    await chat({ 'content': 'hi', 'user': 'spoofed' }, { 'save': true, 'sessionUser': 'realuser' });
    expect(mocks.chatDB.insert.mock.calls[0][0].user).toEqual('realuser');
  });

  it('replays history from an existing doc and preserves its fields', async () => {
    mocks.chatDB.get.mockResolvedValue({
      '_id': 'doc1',
      '_rev': '1-a',
      'user': 'amara',
      'title': 'old title',
      'createdDate': 1,
      'aiProvider': 'openai',
      'shared': true,
      'conversations': [ { 'id': '1', 'query': 'q1', 'response': 'a1' } ]
    });
    await chat({ 'content': 'q2', '_id': 'doc1', '_rev': '1-a' }, { 'save': true });
    const request = mocks.runProviderChat.mock.calls[0][1];
    expect(request.messages).toEqual([
      { 'role': 'user', 'content': 'q1' },
      { 'role': 'assistant', 'content': 'a1' },
      { 'role': 'user', 'content': 'q2' }
    ]);
    const doc = mocks.chatDB.insert.mock.calls[0][0];
    expect(doc.shared).toEqual(true);
    expect(doc.conversations).toHaveLength(2);
  });

  it('rejects continuing a conversation owned by another user', async () => {
    mocks.chatDB.get.mockResolvedValue({
      '_id': 'doc1',
      '_rev': '1-a',
      'user': 'amara',
      'conversations': [ { 'id': '1', 'query': 'q1', 'response': 'a1' } ]
    });
    await expect(chat({ 'content': 'q2', '_id': 'doc1' }, { 'save': true, 'sessionUser': 'mallory' }))
      .rejects.toMatchObject({ 'statusCode': 403 });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
    expect(mocks.chatDB.insert).not.toHaveBeenCalled();
  });

  it('lets the owner continue their conversation', async () => {
    mocks.chatDB.get.mockResolvedValue({
      '_id': 'doc1',
      '_rev': '1-a',
      'user': 'amara',
      'conversations': [ { 'id': '1', 'query': 'q1', 'response': 'a1' } ]
    });
    await chat({ 'content': 'q2', '_id': 'doc1' }, { 'save': true, 'sessionUser': 'amara' });
    expect(mocks.chatDB.insert).toHaveBeenCalled();
  });

  it('maps a missing conversation to a 404', async () => {
    mocks.chatDB.get.mockRejectedValue(Object.assign(new Error('missing'), { 'statusCode': 404 }));
    await expect(chat({ 'content': 'q', '_id': 'nope' }, { 'save': true })).rejects.toMatchObject({ 'statusCode': 404 });
  });

  it('builds instructions from the mode profile plus context data', async () => {
    await chat({ 'content': 'hi', 'mode': 'course_help', 'context': { 'data': 'STEP CONTEXT' } }, { 'save': false });
    const request = mocks.runProviderChat.mock.calls[0][1];
    expect(request.instructions).toEqual('COURSE PROFILE\n\nSTEP CONTEXT');
  });

  it('supports legacy string contexts', async () => {
    await chat({ 'content': 'hi', 'context': 'LEGACY' as any }, { 'save': false });
    expect(mocks.runProviderChat.mock.calls[0][1].instructions).toEqual('GENERAL PROFILE\n\nLEGACY');
  });

  it('wires file_search when the context resource is indexable', async () => {
    mocks.ensureResourceIndexed.mockResolvedValue({ 'vectorStoreId': 'vs_1', 'indexedFiles': [ 'a.pdf' ] });
    await chat({ 'content': 'hi', 'context': { 'resource': { 'id': 'res1' } } }, { 'save': false });
    expect(mocks.runProviderChat.mock.calls[0][1].vectorStoreIds).toEqual([ 'vs_1' ]);
  });

  it('degrades gracefully when resource indexing fails', async () => {
    mocks.ensureResourceIndexed.mockRejectedValue(new Error('boom'));
    const outcome = await chat({ 'content': 'hi', 'context': { 'resource': { 'id': 'res1' } } }, { 'save': false });
    expect(outcome.completionText).toEqual('the answer');
    expect(mocks.runProviderChat.mock.calls[0][1].vectorStoreIds).toBeUndefined();
  });

  it('skips resource indexing for non-openai providers', async () => {
    await chat(
      { 'content': 'hi', 'aiProvider': { 'name': 'perplexity' }, 'context': { 'resource': { 'id': 'res1' } } },
      { 'save': false }
    );
    expect(mocks.ensureResourceIndexed).not.toHaveBeenCalled();
  });

  it('stores citations on the saved turn', async () => {
    mocks.runProviderChat.mockResolvedValue({
      'text': 'cited answer',
      'responseId': 'resp_2',
      'citations': [ { 'title': 'guide.pdf', 'fileId': 'file_1' } ]
    });
    await chat({ 'content': 'hi' }, { 'save': true });
    const doc = mocks.chatDB.insert.mock.calls[0][0];
    expect(doc.conversations[0].citations).toEqual([ { 'title': 'guide.pdf', 'fileId': 'file_1' } ]);
  });

  it('does not persist anything when the provider call fails', async () => {
    mocks.runProviderChat.mockRejectedValue(new Error('provider down'));
    await expect(chat({ 'content': 'hi' }, { 'save': true })).rejects.toBeTruthy();
    expect(mocks.chatDB.insert).not.toHaveBeenCalled();
  });
});
