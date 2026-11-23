import { describe, expect, it, vi } from 'vitest';

import { ProviderChatRequest } from '../models/chat.model';
import { compatChat } from './openai-compat.provider';

const baseRequest = (): ProviderChatRequest => ({
  'model': 'model-test',
  'messages': [ { 'role': 'user', 'content': 'hello' } ],
  'instructions': 'BE HELPFUL'
});

const clientEnding = (content: string, finishReason: string | null, streaming: boolean): any => {
  const choice = { [streaming ? 'delta' : 'message']: { content }, 'finish_reason': finishReason };
  const create = vi.fn().mockResolvedValue(streaming
    ? (async function* () {
      yield { 'choices': [ choice ] };
    })()
    : { 'choices': [ choice ] });
  return { 'chat': { 'completions': { create } } };
};

const run = (client: any, streaming: boolean) =>
  compatChat(client, { ...baseRequest(), ...(streaming ? { 'onDelta': () => undefined } : {}) });

describe('OpenAI-compatible provider', () => {
  it('sends the instructions as a system message', async () => {
    const client = clientEnding('answer', 'stop', false);

    expect(await compatChat(client, baseRequest())).toEqual({ 'text': 'answer', 'citations': [] });
    expect(client.chat.completions.create.mock.calls[0][0].messages).toEqual([
      { 'role': 'system', 'content': 'BE HELPFUL' },
      { 'role': 'user', 'content': 'hello' }
    ]);
  });

  it('streams each piece of text as it arrives', async () => {
    const create = vi.fn().mockResolvedValue((async function* () {
      yield { 'choices': [ { 'delta': { 'content': 'an' } } ] };
      yield { 'choices': [ { 'delta': { 'content': 'swer' }, 'finish_reason': 'stop' } ] };
    })());
    const client: any = { 'chat': { 'completions': { create } } };
    const deltas: string[] = [];

    const result = await compatChat(client, { ...baseRequest(), 'onDelta': (delta) => deltas.push(delta) });

    expect(result).toEqual({ 'text': 'answer', 'citations': [] });
    expect(deltas).toEqual([ 'an', 'swer' ]);
    expect(create.mock.calls[0][0].stream).toBe(true);
  });

  it('refuses a completion without choices', async () => {
    const client: any = { 'chat': { 'completions': { 'create': vi.fn().mockResolvedValue({ 'choices': [] }) } } };
    await expect(compatChat(client, baseRequest())).rejects.toThrow('Unexpected AI response');
  });

  describe.each([ true, false ])('streaming: %s', (streaming) => {
    it.each([ '', '  \n ' ])('refuses the empty reply %j', async (content) => {
      await expect(run(clientEnding(content, 'stop', streaming), streaming)).rejects.toThrow('Unexpected AI response');
    });

    it.each([ 'content_filter', 'tool_calls', 'function_call', 'insufficient_system_resource' ])(
      'refuses text that ends with %s',
      async (reason) => {
        await expect(run(clientEnding('partial', reason, streaming), streaming)).rejects.toThrow(`AI response ended with ${reason}`);
      }
    );

    it.each([ 'stop', 'length', 'end_turn', null ])('keeps text that ends with %s', async (reason) => {
      await expect(run(clientEnding('partial', reason, streaming), streaming)).resolves.toEqual({ 'text': 'partial', 'citations': [] });
    });
  });
});
