import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'chatDB': { 'get': vi.fn(), 'insert': vi.fn() },
  'getAIConfig': vi.fn(),
  'runProviderChat': vi.fn(),
  'providerSupports': vi.fn(),
  'ensureResourceIndexed': vi.fn(),
  'markResourceIndexDirtyIfUnavailable': vi.fn(),
  'resourceHasSupportedAttachments': vi.fn()
}));

vi.mock('../../../config/couch.config', () => ({ 'chatDB': mocks.chatDB }));
vi.mock('./config.service', () => ({ 'getAIConfig': mocks.getAIConfig }));
vi.mock('./resource-index.service', () => ({
  'ensureResourceIndexed': mocks.ensureResourceIndexed,
  'markResourceIndexDirtyIfUnavailable': mocks.markResourceIndexDirtyIfUnavailable,
  'resourceHasSupportedAttachments': mocks.resourceHasSupportedAttachments
}));
vi.mock('../providers', () => ({
  'runProviderChat': mocks.runProviderChat,
  'providerSupports': mocks.providerSupports
}));

import { chat } from './chat.service';
import { HttpError } from '../utils/http-error';

const runtime = (name: string, enabled = true) => ({
  name,
  enabled,
  'client': enabled ? { 'kind': 'chat' } : undefined,
  'fileSearchClient': enabled && name === 'openai' ? { 'kind': 'file-search' } : undefined,
  'defaultModel': `${name}-default-model`
});

const config = () => ({
  'providers': {
    'openai': runtime('openai'),
    'perplexity': runtime('perplexity'),
    'deepseek': runtime('deepseek', false),
    'gemini': runtime('gemini', false),
    'anthropic': runtime('anthropic', false)
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
    mocks.runProviderChat.mockResolvedValue({ 'text': 'the answer', 'citations': [] });
    mocks.providerSupports.mockImplementation((name: string, capability: string) =>
      name === 'openai' && capability === 'fileSearch');
    mocks.chatDB.insert.mockResolvedValue({ 'ok': true, 'id': 'doc1', 'rev': '1-a' });
    mocks.resourceHasSupportedAttachments.mockResolvedValue(false);
  });

  afterEach(() => {
    delete process.env.CHAT_MAX_CONVERSATION_TURNS;
    delete process.env.CHAT_HISTORY_REPLAY_TURNS;
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
      { 'content': longContent, 'user': 'amara', 'context': { 'type': 'coursestep', 'data': 'step info' } },
      { 'save': true }
    );
    const doc = mocks.chatDB.insert.mock.calls[0][0];
    expect(doc.user).toEqual('amara');
    expect(doc.title.length).toBeLessThanOrEqual(60);
    expect(doc.aiProvider).toEqual('openai');
    expect(doc.conversations).toHaveLength(1);
    expect(doc.conversations[0]).toMatchObject({ 'query': longContent, 'response': 'the answer' });
    expect(doc).not.toHaveProperty('lastResponseId');
    expect(doc).not.toHaveProperty('context');
  });

  it('persists the resolved mode so the client can partition chat history', async () => {
    await chat({ 'content': 'hi', 'mode': 'course_help' }, { 'save': true });
    expect(mocks.chatDB.insert.mock.calls[0][0].mode).toEqual('course_help');
    await chat({ 'content': 'hi' }, { 'save': true });
    expect(mocks.chatDB.insert.mock.calls[1][0].mode).toEqual('general_chat');
  });

  it('ignores a client-supplied model and bills the configured one', async () => {
    await chat({ 'content': 'hi', 'aiProvider': { 'name': 'openai', 'model': 'gpt-expensive' } } as any, { 'save': false });
    expect(mocks.runProviderChat.mock.calls[0][1].model).toEqual('openai-default-model');
  });

  it('rejects an explicit unknown or malformed provider instead of billing OpenAI', async () => {
    await expect(chat(
      { 'content': 'hi', 'aiProvider': { 'name': 'typo' } as any },
      { 'save': false }
    )).rejects.toMatchObject({ 'statusCode': 400 });
    await expect(chat(
      { 'content': 'hi', 'aiProvider': {} as any },
      { 'save': false }
    )).rejects.toMatchObject({ 'statusCode': 400 });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
  });

  it('rejects providers with no configured model', async () => {
    const cfg = config();
    cfg.providers.openai.defaultModel = '';
    mocks.getAIConfig.mockResolvedValue(cfg);
    await expect(chat({ 'content': 'hi' }, { 'save': false })).rejects.toMatchObject({ 'statusCode': 503 });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
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
    await chat({ 'content': 'q2', '_id': 'doc1' }, { 'save': true, 'sessionUser': 'amara' });
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

  it('persists full history while replaying only the most recent configured turns', async () => {
    const conversations = Array.from({ length: 25 }, (_, index) => ({
      'id': String(index + 1),
      'query': `q${index + 1}`,
      'response': `a${index + 1}`
    }));
    mocks.chatDB.get.mockResolvedValue({
      '_id': 'doc1', '_rev': '1-a', 'user': 'amara', 'title': 'long chat', 'createdDate': 1,
      'aiProvider': 'openai', conversations
    });

    await chat({ 'content': 'q26', '_id': 'doc1' }, { 'save': true, 'sessionUser': 'amara' });

    const request = mocks.runProviderChat.mock.calls[0][1];
    expect(request.messages).toHaveLength(41);
    expect(request.messages.slice(0, 2)).toEqual([
      { 'role': 'user', 'content': 'q6' },
      { 'role': 'assistant', 'content': 'a6' }
    ]);
    expect(request.messages.at(-1)).toEqual({ 'role': 'user', 'content': 'q26' });
    expect(mocks.chatDB.insert.mock.calls[0][0].conversations).toHaveLength(26);
  });

  it('enforces a configurable persisted-turn limit before provider work', async () => {
    process.env.CHAT_MAX_CONVERSATION_TURNS = '2';
    mocks.chatDB.get.mockResolvedValue({
      '_id': 'doc1', '_rev': '1-a', 'user': 'amara', 'title': 'full chat', 'createdDate': 1,
      'aiProvider': 'openai',
      'conversations': [
        { 'id': '1', 'query': 'q1', 'response': 'a1' },
        { 'id': '2', 'query': 'q2', 'response': 'a2' }
      ]
    });

    await expect(chat({ 'content': 'q3', '_id': 'doc1' }, { 'save': true, 'sessionUser': 'amara' }))
      .rejects.toMatchObject({
        'statusCode': 409,
        'code': 'conversation_turn_limit',
        'message': 'This conversation has reached its 2-turn limit. Start a new conversation to continue.'
      });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
    expect(mocks.chatDB.insert).not.toHaveBeenCalled();
  });

  it('does not replay legacy failed turns with blank responses', async () => {
    mocks.chatDB.get.mockResolvedValue({
      '_id': 'doc1', '_rev': '1-a', 'user': 'amara', 'title': 'old title', 'createdDate': 1,
      'aiProvider': 'openai',
      'conversations': [
        { 'id': '1', 'query': 'failed question', 'response': '' },
        { 'id': '2', 'query': 'successful question', 'response': 'answer' }
      ]
    });
    await chat({ 'content': 'next', '_id': 'doc1' }, { 'save': true });
    expect(mocks.runProviderChat.mock.calls[0][1].messages).toEqual([
      { 'role': 'user', 'content': 'successful question' },
      { 'role': 'assistant', 'content': 'answer' },
      { 'role': 'user', 'content': 'next' }
    ]);
  });

  it('refreshes a stale revision after completion and retries one save conflict', async () => {
    const initial = {
      '_id': 'doc1', '_rev': '1-a', 'user': 'amara', 'title': 'old title', 'createdDate': 1,
      'aiProvider': 'openai', 'conversations': [ { 'id': '1', 'query': 'q1', 'response': 'a1' } ]
    };
    const concurrent = {
      ...initial,
      '_rev': '2-b',
      'conversations': [ ...initial.conversations, { 'id': '2', 'query': 'other', 'response': 'other answer' } ]
    };
    mocks.chatDB.get
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(concurrent)
      .mockResolvedValueOnce({ ...concurrent, '_rev': '3-c' });
    mocks.chatDB.insert
      .mockRejectedValueOnce(Object.assign(new Error('conflict'), { 'statusCode': 409 }))
      .mockResolvedValueOnce({ 'ok': true, 'id': 'doc1', 'rev': '4-d' });

    await chat({ 'content': 'q2', '_id': 'doc1' }, { 'save': true, 'sessionUser': 'amara' });

    expect(mocks.runProviderChat).toHaveBeenCalledTimes(1);
    expect(mocks.chatDB.insert).toHaveBeenCalledTimes(2);
    const saved = mocks.chatDB.insert.mock.calls[1][0];
    expect(saved._rev).toEqual('3-c');
    expect(saved.conversations.map((item: { query: string }) => item.query)).toEqual([ 'q1', 'other', 'q2' ]);
  });

  it('does not exceed the turn cap when another tab fills the conversation during provider work', async () => {
    process.env.CHAT_MAX_CONVERSATION_TURNS = '2';
    const initial = {
      '_id': 'doc1', '_rev': '1-a', 'user': 'amara', 'title': 'chat', 'createdDate': 1,
      'aiProvider': 'openai', 'conversations': [ { 'id': '1', 'query': 'q1', 'response': 'a1' } ]
    };
    mocks.chatDB.get
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        ...initial,
        '_rev': '2-b',
        'conversations': [ ...initial.conversations, { 'id': '2', 'query': 'other', 'response': 'answer' } ]
      });

    await expect(chat({ 'content': 'q2', '_id': 'doc1' }, { 'save': true, 'sessionUser': 'amara' }))
      .rejects.toMatchObject({ 'statusCode': 409, 'code': 'conversation_turn_limit' });
    expect(mocks.runProviderChat).toHaveBeenCalledTimes(1);
    expect(mocks.chatDB.insert).not.toHaveBeenCalled();
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

  it('fails closed when an authenticated user requests a conversation with no owner', async () => {
    mocks.chatDB.get.mockResolvedValue({
      '_id': 'chat1',
      'title': 'legacy malformed chat',
      'createdDate': 1,
      'aiProvider': 'openai',
      'conversations': []
    });
    await expect(chat({ 'content': 'continue', '_id': 'chat1' }, { 'save': true, 'sessionUser': 'amara' }))
      .rejects.toMatchObject({ 'statusCode': 403 });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
  });

  it('keeps instructions server-controlled and combines context with the current user turn', async () => {
    await chat({
      'content': 'hi',
      'mode': 'course_help',
      'locale': 'es',
      'context': { 'data': 'STEP CONTEXT' }
    }, { 'save': false });
    const request = mocks.runProviderChat.mock.calls[0][1];
    expect(request.instructions).toEqual(
      'COURSE PROFILE\n\nRespond in Spanish unless the user explicitly requests another language.'
    );
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].role).toEqual('user');
    expect(request.messages[0].content).toContain('not instructions');
    expect(request.messages[0].content).toContain('STEP CONTEXT');
    expect(request.messages[0].content).toMatch(/STEP CONTEXT[\s\S]*hi$/);
  });

  it('supports legacy string contexts', async () => {
    await chat({ 'content': 'hi', 'context': 'LEGACY' as any }, { 'save': false });
    const request = mocks.runProviderChat.mock.calls[0][1];
    expect(request.instructions).toEqual('GENERAL PROFILE');
    expect(request.messages[0].content).toContain('LEGACY');
  });

  it('wires file search with ownership and records attachment presence', async () => {
    mocks.ensureResourceIndexed.mockResolvedValue({
      'vectorStoreId': 'vs_1', 'fileNamesById': { 'file_1': 'a.pdf' }
    });
    await chat(
      { 'content': 'hi', 'context': { 'resource': { 'id': 'res1' } } },
      { 'save': true, 'sessionUser': 'amara' }
    );
    expect(mocks.runProviderChat.mock.calls[0][1].vectorStoreIds).toEqual([ 'vs_1' ]);
    expect(mocks.ensureResourceIndexed).toHaveBeenCalledWith(expect.anything(), 'res1', 'amara', undefined);
    expect(mocks.ensureResourceIndexed.mock.calls[0][0]).toEqual({ 'kind': 'file-search' });
    const turn = mocks.chatDB.insert.mock.calls[0][0].conversations[0];
    expect(turn.hasAttachments).toEqual(true);
    expect(turn).not.toHaveProperty('citations');
  });

  it('does not silently answer without requested OpenAI attachment grounding', async () => {
    mocks.ensureResourceIndexed.mockRejectedValue(new Error('boom'));
    await expect(chat(
      { 'content': 'hi', 'context': { 'resource': { 'id': 'res1' } } },
      { 'save': false }
    )).rejects.toMatchObject({
      'statusCode': 500,
      'message': 'Could not prepare resource attachments for AI search'
    });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
  });

  it('skips resource indexing for non-openai providers', async () => {
    await chat(
      { 'content': 'hi', 'aiProvider': { 'name': 'perplexity' }, 'context': { 'resource': { 'id': 'res1' } } },
      { 'save': false }
    );
    expect(mocks.resourceHasSupportedAttachments).toHaveBeenCalledWith('res1', undefined, undefined);
    expect(mocks.ensureResourceIndexed).not.toHaveBeenCalled();
  });

  it('rejects server-side resource attachments for providers without file search', async () => {
    mocks.resourceHasSupportedAttachments.mockResolvedValue(true);
    await expect(chat(
      {
        'content': 'summarize the attachment',
        'aiProvider': { 'name': 'perplexity' },
        'context': { 'resource': { 'id': 'res1' } }
      },
      { 'save': false, 'sessionUser': 'amara' }
    )).rejects.toMatchObject({
      'statusCode': 400,
      'message': 'AI provider "perplexity" does not support resource attachment search; select a provider with file-search support',
      'code': 'resource_attachments_unsupported'
    });
    expect(mocks.resourceHasSupportedAttachments).toHaveBeenCalledWith('res1', 'amara', undefined);
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
  });

  it('sanitizes unexpected resource inspection failures for compatible providers', async () => {
    mocks.resourceHasSupportedAttachments.mockRejectedValue(new Error('CouchDB connection details'));

    await expect(chat(
      { 'content': 'hi', 'aiProvider': { 'name': 'perplexity' }, 'context': { 'resource': { 'id': 'res1' } } },
      { 'save': false }
    )).rejects.toMatchObject({
      'statusCode': 500,
      'message': 'Could not inspect resource attachments'
    });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
  });

  it('returns a stable error when compatible-provider resource context is missing', async () => {
    mocks.resourceHasSupportedAttachments.mockRejectedValue(Object.assign(new Error('missing'), { 'statusCode': 404 }));

    await expect(chat(
      { 'content': 'hi', 'aiProvider': { 'name': 'perplexity' }, 'context': { 'resource': { 'id': 'gone' } } },
      { 'save': false }
    )).rejects.toMatchObject({
      'statusCode': 404,
      'message': 'Resource context is unavailable',
      'code': 'resource_context_unavailable'
    });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
  });

  it('returns the same stable error when OpenAI cannot access private resource context', async () => {
    mocks.ensureResourceIndexed.mockRejectedValue(new HttpError(403, 'This resource is private'));

    await expect(chat(
      { 'content': 'hi', 'context': { 'resource': { 'id': 'private' } } },
      { 'save': false, 'sessionUser': 'amara' }
    )).rejects.toMatchObject({
      'statusCode': 403,
      'message': 'Resource context is unavailable',
      'code': 'resource_context_unavailable'
    });
    expect(mocks.runProviderChat).not.toHaveBeenCalled();
  });

  it('maps provider file IDs to attachment names in the outcome and saved turn', async () => {
    mocks.ensureResourceIndexed.mockResolvedValue({
      'vectorStoreId': 'vs_1', 'fileNamesById': { 'file_1': 'guide.pdf' }
    });
    mocks.runProviderChat.mockResolvedValue({
      'text': 'cited answer', 'citations': [ { 'fileId': 'file_1' } ]
    });
    const outcome = await chat(
      { 'content': 'hi', 'context': { 'resource': { 'id': 'res1' } } },
      { 'save': true }
    );
    expect(outcome.citations).toEqual([ { 'title': 'guide.pdf', 'fileId': 'file_1' } ]);
    expect(mocks.chatDB.insert.mock.calls[0][0].conversations[0].citations).toEqual(outcome.citations);
  });

  it('does not start persistence after the caller cancels at provider completion', async () => {
    const controller = new AbortController();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.runProviderChat.mockImplementation(async () => {
      controller.abort(new Error('client disconnected'));
      return { 'text': 'paid answer', 'citations': [] };
    });
    await expect(chat({ 'content': 'hi' }, { 'save': true, 'signal': controller.signal })).rejects.toMatchObject({
      'statusCode': 499,
      'message': 'AI provider request cancelled'
    });
    expect(mocks.chatDB.insert).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('does not persist anything when the provider call fails', async () => {
    mocks.runProviderChat.mockRejectedValue(new Error('provider down'));
    await expect(chat({ 'content': 'hi' }, { 'save': true })).rejects.toBeTruthy();
    expect(mocks.chatDB.insert).not.toHaveBeenCalled();
  });

  it('checks a failed file-search turn for an unavailable saved vector store', async () => {
    mocks.ensureResourceIndexed.mockResolvedValue({
      'vectorStoreId': 'vs_1', 'fileNamesById': { 'file_1': 'guide.pdf' }
    });
    mocks.runProviderChat.mockRejectedValue(new Error('provider failed'));
    mocks.markResourceIndexDirtyIfUnavailable.mockReturnValue(new Promise(() => undefined));

    await expect(chat(
      { 'content': 'hi', 'context': { 'resource': { 'id': 'res1' } } },
      { 'save': false }
    )).rejects.toBeTruthy();

    expect(mocks.markResourceIndexDirtyIfUnavailable).toHaveBeenCalledWith(
      expect.anything(), 'res1', 'vs_1'
    );
  });
});
