import { describe, expect, it, vi } from 'vitest';

import { openaiChat } from './openai.provider';
import { compatChat } from './openai-compat.provider';
import { ProviderChatRequest } from '../models/chat.model';

const baseRequest = (): ProviderChatRequest => ({
  'model': 'gpt-test',
  'messages': [ { 'role': 'user', 'content': 'hello' } ],
  'instructions': 'BE HELPFUL'
});

const finalResponse = {
  'id': 'resp_1',
  'output_text': 'streamed answer',
  'output': [
    {
      'type': 'message',
      'content': [
        {
          'type': 'output_text',
          'text': 'streamed answer',
          'annotations': [
            { 'type': 'file_citation', 'file_id': 'file_1', 'filename': 'guide.pdf' },
            { 'type': 'file_citation', 'file_id': 'file_1', 'filename': 'guide.pdf' }
          ]
        }
      ]
    }
  ]
};

describe('openai provider (Responses API)', () => {
  it('sends instructions, tools and schema through responses.create', async () => {
    const create = vi.fn().mockResolvedValue({ 'id': 'resp_1', 'output_text': 'answer', 'output': [] });
    const client: any = { 'responses': { create } };
    const result = await openaiChat(client, {
      ...baseRequest(),
      'vectorStoreIds': [ 'vs_1' ],
      'jsonSchema': { 'name': 'test_schema', 'schema': { 'type': 'object' } }
    });
    const params = create.mock.calls[0][0];
    expect(params.model).toEqual('gpt-test');
    expect(params.instructions).toEqual('BE HELPFUL');
    expect(params.input).toEqual([ { 'role': 'user', 'content': 'hello' } ]);
    expect(params.tools).toEqual([ { 'type': 'file_search', 'vector_store_ids': [ 'vs_1' ] } ]);
    expect(params.text.format).toMatchObject({ 'type': 'json_schema', 'name': 'test_schema', 'strict': true });
    expect(result).toEqual({ 'text': 'answer', 'responseId': 'resp_1', 'citations': [] });
  });

  it('rejects an empty completion', async () => {
    const client: any = { 'responses': { 'create': vi.fn().mockResolvedValue({ 'id': 'resp_1', 'output_text': '', 'output': [] }) } };
    await expect(openaiChat(client, baseRequest())).rejects.toThrow('Unexpected AI response');
  });

  it('streams deltas and dedupes citations from the final response', async () => {
    const events = [
      { 'type': 'response.output_text.delta', 'delta': 'streamed ' },
      { 'type': 'response.output_text.delta', 'delta': 'answer' },
      { 'type': 'response.completed', 'response': finalResponse }
    ];
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue((async function* () {
          yield* events;
        })())
      }
    };
    const deltas: string[] = [];
    const result = await openaiChat(client, { ...baseRequest(), 'onDelta': (delta) => deltas.push(delta) });
    expect(client.responses.create.mock.calls[0][0].stream).toEqual(true);
    expect(deltas).toEqual([ 'streamed ', 'answer' ]);
    expect(result.text).toEqual('streamed answer');
    expect(result.responseId).toEqual('resp_1');
    expect(result.citations).toEqual([ { 'title': 'guide.pdf', 'fileId': 'file_1' } ]);
  });

  it('propagates streamed failures', async () => {
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue((async function* () {
          yield { 'type': 'response.failed', 'response': { 'error': { 'message': 'quota exceeded' } } };
        })())
      }
    };
    await expect(openaiChat(client, { ...baseRequest(), 'onDelta': () => undefined })).rejects.toThrow('quota exceeded');
  });
});

describe('openai-compatible provider (Chat Completions)', () => {
  it('injects instructions as a system message', async () => {
    const create = vi.fn().mockResolvedValue({ 'choices': [ { 'message': { 'content': 'answer' } } ] });
    const client: any = { 'chat': { 'completions': { create } } };
    const result = await compatChat(client, baseRequest());
    expect(create.mock.calls[0][0].messages).toEqual([
      { 'role': 'system', 'content': 'BE HELPFUL' },
      { 'role': 'user', 'content': 'hello' }
    ]);
    expect(result).toEqual({ 'text': 'answer', 'citations': [] });
  });

  it('streams completion chunks', async () => {
    const chunks = [
      { 'choices': [ { 'delta': { 'content': 'an' } } ] },
      { 'choices': [ { 'delta': { 'content': 'swer' } } ] },
      { 'choices': [ { 'delta': {} } ] }
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
    const result = await compatChat(client, { ...baseRequest(), 'onDelta': (delta) => deltas.push(delta) });
    expect(deltas).toEqual([ 'an', 'swer' ]);
    expect(result.text).toEqual('answer');
  });
});
