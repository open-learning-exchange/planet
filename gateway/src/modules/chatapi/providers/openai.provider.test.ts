import { describe, expect, it, vi } from 'vitest';

import { ProviderChatRequest } from '../models/chat.model';
import { openaiChat } from './openai.provider';

const baseRequest = (): ProviderChatRequest => ({
  'model': 'gpt-test',
  'messages': [ { 'role': 'user', 'content': 'hello' } ],
  'instructions': 'BE HELPFUL'
});

describe('OpenAI Responses provider', () => {
  it('sends basic chat without retaining the response', async () => {
    const create = vi.fn().mockResolvedValue({ 'id': 'resp_1', 'status': 'completed', 'output_text': 'answer' });
    const result = await openaiChat({ 'responses': { create } } as any, baseRequest());
    expect(create).toHaveBeenCalledWith(
      {
        'model': 'gpt-test',
        'store': false,
        'input': [ { 'role': 'user', 'content': 'hello' } ],
        'instructions': 'BE HELPFUL'
      },
      { 'signal': undefined }
    );
    expect(result).toEqual({ 'text': 'answer', 'citations': [] });
  });

  it('wires file search and strict structured output into Responses requests', async () => {
    const create = vi.fn().mockResolvedValue({ 'id': 'resp_1', 'status': 'completed', 'output_text': 'answer' });
    await openaiChat({ 'responses': { create } } as any, {
      ...baseRequest(),
      'vectorStoreIds': [ 'vs_1' ],
      'jsonSchema': { 'name': 'result', 'schema': { 'type': 'object', 'additionalProperties': false } }
    });

    expect(create.mock.calls[0][0]).toMatchObject({
      'tools': [ { 'type': 'file_search', 'vector_store_ids': [ 'vs_1' ] } ],
      'text': {
        'format': {
          'type': 'json_schema',
          'name': 'result',
          'schema': { 'type': 'object', 'additionalProperties': false },
          'strict': true
        }
      }
    });
  });

  it('collects file citations and deduplicates them by file id', async () => {
    const create = vi.fn().mockResolvedValue({
      'id': 'resp_1',
      'status': 'completed',
      'output_text': 'grounded answer',
      'output': [ {
        'type': 'message',
        'content': [ {
          'type': 'output_text',
          'text': 'grounded answer',
          'annotations': [
            { 'type': 'file_citation', 'file_id': 'file_1' },
            { 'type': 'file_citation', 'file_id': 'file_1' },
            { 'type': 'file_citation', 'file_id': 'file_2' }
          ]
        } ]
      } ]
    });

    const result = await openaiChat({ 'responses': { create } } as any, baseRequest());
    expect(result.citations).toEqual([
      { 'fileId': 'file_1' },
      { 'fileId': 'file_2' }
    ]);
  });

  it('rejects an empty completion', async () => {
    const client: any = {
      'responses': { 'create': vi.fn().mockResolvedValue({ 'id': 'resp_1', 'status': 'completed', 'output_text': '' }) }
    };
    await expect(openaiChat(client, baseRequest())).rejects.toThrow('Unexpected AI response');
  });

  it('preserves non-empty non-streaming responses truncated by the output limit', async () => {
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue({
          'id': 'resp_1',
          'status': 'incomplete',
          'incomplete_details': { 'reason': 'max_output_tokens' },
          'output_text': 'partial',
          'output': []
        })
      }
    };
    await expect(openaiChat(client, baseRequest())).resolves.toEqual({ 'text': 'partial', 'citations': [] });
  });

  it('rejects content-filtered non-streaming responses even when they contain partial text', async () => {
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue({
          'id': 'resp_1',
          'status': 'incomplete',
          'incomplete_details': { 'reason': 'content_filter' },
          'output_text': 'partial'
        })
      }
    };
    await expect(openaiChat(client, baseRequest())).rejects.toThrow('AI response incomplete');
  });

  it('surfaces the provider reason for failed non-streaming responses', async () => {
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue({
          'id': 'resp_1', 'status': 'failed', 'output_text': '', 'error': { 'message': 'provider failed' }
        })
      }
    };
    await expect(openaiChat(client, baseRequest())).rejects.toThrow('provider failed');
  });

  it('streams deltas and returns the completed text', async () => {
    const events = [
      { 'type': 'response.output_text.delta', 'delta': 'streamed ' },
      { 'type': 'response.output_text.delta', 'delta': 'answer' },
      { 'type': 'response.completed', 'response': { 'id': 'resp_1' } }
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
    expect(result).toEqual({ 'text': 'streamed answer', 'citations': [] });
  });

  it('propagates streaming failures', async () => {
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue((async function* () {
          yield { 'type': 'response.failed', 'response': { 'error': { 'message': 'quota exceeded' } } };
        })())
      }
    };
    await expect(openaiChat(client, { ...baseRequest(), 'onDelta': () => undefined })).rejects.toThrow('quota exceeded');
  });

  it('preserves non-empty streaming responses truncated by the output limit', async () => {
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue((async function* () {
          yield { 'type': 'response.output_text.delta', 'delta': 'partial' };
          yield {
            'type': 'response.incomplete',
            'response': {
              'status': 'incomplete',
              'incomplete_details': { 'reason': 'max_output_tokens' },
              'output_text': 'partial',
              'output': []
            }
          };
        })())
      }
    };
    await expect(openaiChat(client, { ...baseRequest(), 'onDelta': () => undefined })).resolves.toEqual({
      'text': 'partial',
      'citations': []
    });
  });

  it('rejects content-filtered streaming responses', async () => {
    const client: any = {
      'responses': {
        'create': vi.fn().mockResolvedValue((async function* () {
          yield { 'type': 'response.output_text.delta', 'delta': 'partial' };
          yield {
            'type': 'response.incomplete',
            'response': {
              'status': 'incomplete',
              'incomplete_details': { 'reason': 'content_filter' },
              'output_text': 'partial'
            }
          };
        })())
      }
    };
    await expect(openaiChat(client, { ...baseRequest(), 'onDelta': () => undefined })).rejects.toThrow('AI response incomplete');
  });

});
