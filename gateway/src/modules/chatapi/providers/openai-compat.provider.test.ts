import { describe, expect, it, vi } from 'vitest';

import { ProviderChatRequest } from '../models/chat.model';
import { compatChat } from './openai-compat.provider';

const baseRequest = (): ProviderChatRequest => ({
  'model': 'gpt-test',
  'messages': [ { 'role': 'user', 'content': 'hello' } ],
  'instructions': 'BE HELPFUL'
});

describe('OpenAI-compatible provider', () => {
  it('injects instructions as a system message', async () => {
    const create = vi.fn().mockResolvedValue({
      'choices': [ { 'message': { 'content': 'answer' }, 'finish_reason': 'stop' } ]
    });
    const client: any = { 'chat': { 'completions': { create } } };

    expect(await compatChat(client, baseRequest())).toEqual({ 'text': 'answer', 'citations': [] });
    expect(create.mock.calls[0][0].messages).toEqual([
      { 'role': 'system', 'content': 'BE HELPFUL' },
      { 'role': 'user', 'content': 'hello' }
    ]);
  });

  it('classifies an empty choices array as an unexpected response', async () => {
    const client: any = { 'chat': { 'completions': { 'create': vi.fn().mockResolvedValue({ 'choices': [] }) } } };
    await expect(compatChat(client, baseRequest())).rejects.toThrow('Unexpected AI response');
  });

  it('streams completion chunks', async () => {
    const chunks = [
      { 'choices': [ { 'delta': { 'content': 'an' } } ] },
      { 'choices': [ { 'delta': { 'content': 'swer' }, 'finish_reason': 'stop' } ] }
    ];
    const client: any = {
      'chat': {
        'completions': {
          'create': vi.fn().mockResolvedValue((async function* () {
            yield* chunks;
          })())
        }
      }
    };
    const deltas: string[] = [];

    expect(await compatChat(client, { ...baseRequest(), 'onDelta': (delta) => deltas.push(delta) })).toEqual({
      'text': 'answer',
      'citations': []
    });
    expect(deltas).toEqual([ 'an', 'swer' ]);
  });

  it.each([
    [ 'streaming', true ],
    [ 'non-streaming', false ]
  ] as const)('preserves a non-empty %s completion truncated by a provider limit', async (label, streaming) => {
    void label;
    const result = { 'choices': [ {
      ...(streaming ? { 'delta': { 'content': 'partial' } } : { 'message': { 'content': 'partial' } }),
      'finish_reason': 'length'
    } ] };
    const create = streaming
      ? vi.fn().mockResolvedValue((async function* () { yield result; })())
      : vi.fn().mockResolvedValue(result);
    const client: any = { 'chat': { 'completions': { create } } };

    await expect(compatChat(client, {
      ...baseRequest(),
      ...(streaming ? { 'onDelta': () => undefined } : {})
    })).resolves.toEqual({ 'text': 'partial', 'citations': [] });
  });

  it.each([
    [ 'content_filter', false ],
    [ 'tool_calls', true ]
  ] as const)('rejects non-empty output with terminal reason %s', async (finishReason, streaming) => {
    const result = { 'choices': [ {
      ...(streaming ? { 'delta': { 'content': 'partial' } } : { 'message': { 'content': 'partial' } }),
      'finish_reason': finishReason
    } ] };
    const create = streaming
      ? vi.fn().mockResolvedValue((async function* () { yield result; })())
      : vi.fn().mockResolvedValue(result);
    const client: any = { 'chat': { 'completions': { create } } };

    await expect(compatChat(client, {
      ...baseRequest(),
      ...(streaming ? { 'onDelta': () => undefined } : {})
    })).rejects.toThrow('AI response incomplete');
  });

  it('preserves non-empty output with a provider-specific terminal reason', async () => {
    const client: any = {
      'chat': { 'completions': { 'create': vi.fn().mockResolvedValue({
        'choices': [ { 'message': { 'content': 'answer' }, 'finish_reason': 'end_turn' } ]
      }) } }
    };

    await expect(compatChat(client, baseRequest())).resolves.toEqual({ 'text': 'answer', 'citations': [] });
  });

  it('preserves a non-empty stream that ends without a terminal reason', async () => {
    const client: any = {
      'chat': {
        'completions': {
          'create': vi.fn().mockResolvedValue((async function* () {
            yield { 'choices': [ { 'delta': { 'content': 'partial' }, 'finish_reason': null } ] };
          })())
        }
      }
    };
    await expect(compatChat(client, { ...baseRequest(), 'onDelta': () => undefined }))
      .resolves.toEqual({ 'text': 'partial', 'citations': [] });
  });
});
