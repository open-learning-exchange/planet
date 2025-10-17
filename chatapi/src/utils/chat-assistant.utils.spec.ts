import { buildAssistantResponseParams, createAssistantResponse, createAssistantResponseStream } from './chat-assistant.utils';
import { ChatMessage } from '../models/chat.model';

const mockCreate = jest.fn();
const mockStream = jest.fn();
const mockDone = jest.fn().mockResolvedValue(undefined);

class MockResponseStream {
  private events: any[];
  finalResponse: jest.Mock;
  done = mockDone;

  constructor(events: any[], finalResponse: any) {
    this.events = events;
    this.finalResponse = jest.fn().mockResolvedValue(finalResponse);
  }

  async *[Symbol.asyncIterator]() {
    for (const event of this.events) {
      yield event;
    }
  }
}

jest.mock('../config/ai-providers.config', () => ({
  assistant: {
    instructions: 'Be concise.',
    tools: [ { type: 'code_interpreter' } ],
    response_format: 'text',
    parallel_tool_calls: true,
  },
  keys: {
    openai: {
      responses: {
        create: (...args: unknown[]) => mockCreate(...args),
        stream: (...args: unknown[]) => mockStream(...args),
      },
    },
  },
}));

describe('chat-assistant utils', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockStream.mockReset();
    mockDone.mockClear();
  });

  it('buildAssistantResponseParams merges instructions and context', () => {
    const messages: ChatMessage[] = [ { role: 'user', content: 'Hello there' } ];
    const params = buildAssistantResponseParams(messages, 'gpt-test', 'Context info');

    expect(params.model).toBe('gpt-test');
    expect(params.instructions).toContain('Be concise.');
    expect(params.instructions).toContain('Context info');
    expect(params.tools).toEqual([ { type: 'code_interpreter' } ]);
    expect(params.response_format).toBe('text');
    expect(params.parallel_tool_calls).toBe(true);
    expect(params.input).toEqual([
      {
        role: 'user',
        content: [ { type: 'text', text: 'Hello there' } ]
      }
    ]);
  });

  it('createAssistantResponse returns aggregated text from the API response', async () => {
    mockCreate.mockResolvedValue({
      output: [
        {
          type: 'output_text',
          text: 'Aggregated reply'
        }
      ]
    });

    const messages: ChatMessage[] = [ { role: 'user', content: 'Ping?' } ];
    const params = buildAssistantResponseParams(messages, 'gpt-test');
    const result = await createAssistantResponse(params);

    expect(result).toBe('Aggregated reply');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-test' }));
  });

  it('createAssistantResponseStream collects deltas and final response', async () => {
    const events = [
      { type: 'response.output_text.delta', delta: 'partial ' },
      { type: 'response.output_text.delta', delta: 'message' },
      { type: 'response.completed', response: { output_text: 'partial message!' } }
    ];
    const streamInstance = new MockResponseStream(events, { output_text: 'partial message!' });
    mockStream.mockResolvedValue(streamInstance);

    const callback = jest.fn();
    const messages: ChatMessage[] = [ { role: 'user', content: 'Summarize.' } ];
    const params = buildAssistantResponseParams(messages, 'gpt-test');
    const result = await createAssistantResponseStream(params, callback);

    expect(result).toBe('partial message!');
    expect(callback).toHaveBeenCalledWith('partial ');
    expect(callback).toHaveBeenCalledWith('message');
    expect(mockStream).toHaveBeenCalled();
  });
});
