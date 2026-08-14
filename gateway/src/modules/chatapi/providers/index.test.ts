import { afterEach, describe, expect, it, vi } from 'vitest';
import OpenAI from 'openai';

import { ProviderChatRequest } from '../models/chat.model';
import { providerCapabilities, runProviderChat } from './index';

const baseRequest = (): ProviderChatRequest => ({
  'model': 'gpt-test',
  'messages': [ { 'role': 'user', 'content': 'hello' } ],
  'instructions': 'BE HELPFUL'
});
const runtime = (name: 'openai' | 'perplexity' | 'deepseek', client: any, overrides = {}) => ({
  name,
  'enabled': true,
  client,
  'defaultModel': 'gpt-test',
  'requestTimeoutMs': 1000,
  ...overrides
});

afterEach(() => vi.useRealTimers());

describe('provider dispatch', () => {
  it('enforces the configured deadline through stream consumption', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const create = vi.fn().mockImplementation((params, options) => {
      signal = options.signal;
      return Promise.resolve((async function* () {
        yield await new Promise<never>((resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { 'once': true });
        });
      })());
    });
    const request = runProviderChat(
      runtime('openai', { 'responses': { create } }, { 'requestTimeoutMs': 50 }),
      { ...baseRequest(), 'onDelta': () => undefined }
    );
    const expectation = expect(request).rejects.toMatchObject({
      'statusCode': 504,
      'message': 'AI provider request timed out'
    });

    await vi.advanceTimersByTimeAsync(51);
    await expectation;
    expect(signal?.aborted).toEqual(true);
  });

  it('propagates caller cancellation to the provider request', async () => {
    const caller = new AbortController();
    let providerSignal: AbortSignal | undefined;
    const create = vi.fn().mockImplementation((params, options) => {
      providerSignal = options.signal;
      return new Promise((resolve, reject) => {
        providerSignal?.addEventListener('abort', () => reject(new OpenAI.APIUserAbortError()), { 'once': true });
      });
    });
    const pending = runProviderChat(
      runtime('openai', { 'responses': { create } }, { 'requestTimeoutMs': 10000 }),
      { ...baseRequest(), 'signal': caller.signal }
    );

    caller.abort(new Error('caller disconnected'));

    await expect(pending).rejects.toBeInstanceOf(OpenAI.APIUserAbortError);
    expect(providerSignal?.aborted).toEqual(true);
  });

  it.each([ 'anthropic', 'constructor' ])('rejects unsupported capability lookup %s', (name) => {
    expect(() => providerCapabilities(name)).toThrow(`Unsupported AI provider "${name}"`);
  });

  it('returns provider capability copies', () => {
    const capabilities = providerCapabilities('openai');
    capabilities.pop();
    expect(providerCapabilities('openai')).toEqual([ 'chat', 'fileSearch', 'structuredOutput' ]);
  });

  it('rejects disabled or model-less providers before dispatch', async () => {
    await expect(runProviderChat(
      runtime('openai', undefined, { 'enabled': false }),
      baseRequest()
    )).rejects.toMatchObject({ 'statusCode': 503 });

    await expect(runProviderChat(
      runtime('openai', {}, { 'defaultModel': '' }),
      { ...baseRequest(), 'model': '' }
    )).rejects.toMatchObject({ 'statusCode': 400 });
  });

  it('dispatches OpenAI runtimes to Responses', async () => {
    const create = vi.fn().mockResolvedValue({ 'id': 'resp_1', 'status': 'completed', 'output_text': 'answer' });
    await expect(runProviderChat(runtime('openai', { 'responses': { create } }), baseRequest()))
      .resolves.toMatchObject({ 'text': 'answer' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('dispatches compatible runtimes to Chat Completions', async () => {
    const create = vi.fn().mockResolvedValue({
      'choices': [ { 'message': { 'content': 'answer' }, 'finish_reason': 'stop' } ]
    });
    await expect(runProviderChat(
      runtime('perplexity', { 'chat': { 'completions': { create } } }, { 'defaultModel': 'sonar' }),
      { ...baseRequest(), 'model': 'sonar' }
    )).resolves.toMatchObject({ 'text': 'answer' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported compatible-provider capabilities before dispatch', async () => {
    const create = vi.fn();
    await expect(runProviderChat(
      runtime('deepseek', { 'chat': { 'completions': { create } } }, { 'defaultModel': 'deepseek-chat' }),
      { ...baseRequest(), 'vectorStoreIds': [ 'vs_1' ], 'jsonSchema': { 'name': 'x', 'schema': {} } }
    ))
      .rejects.toMatchObject({ 'statusCode': 400 });
    expect(create).not.toHaveBeenCalled();
  });
});
