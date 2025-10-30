import { aiChat } from './chat.utils';
import { aiChatStream, aiChatNonStream } from './chat-helpers.utils';
import { AIProvider, ChatMessage } from '../models/chat.model';

jest.mock('./chat-helpers.utils', () => ({
  aiChatStream: jest.fn().mockResolvedValue('stream-response'),
  aiChatNonStream: jest.fn().mockResolvedValue('non-stream-response')
}));

const mockedStream = aiChatStream as jest.MockedFunction<typeof aiChatStream>;
const mockedNonStream = aiChatNonStream as jest.MockedFunction<typeof aiChatNonStream>;

describe('aiChat', () => {
  const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
  const provider = { name: 'openai' } as AIProvider;

  beforeEach(() => {
    mockedStream.mockClear();
    mockedNonStream.mockClear();
  });

  it('uses streaming helper when stream flag is true', async () => {
    const callback = jest.fn();

    const response = await aiChat(messages, provider, false, { topic: 'test' }, true, callback);

    expect(response).toBe('stream-response');
    expect(mockedStream).toHaveBeenCalledWith(messages, provider, false, { topic: 'test' }, callback);
    expect(mockedNonStream).not.toHaveBeenCalled();
  });
});
