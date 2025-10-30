import { chatNoSave } from './chat.service';
import { aiChat } from '../utils/chat.utils';
import { AIProvider } from '../models/chat.model';

jest.mock('../utils/chat.utils', () => ({
  aiChat: jest.fn().mockResolvedValue('mock-response')
}));

jest.mock('../config/nano.config', () => ({
  chatDB: {
    insert: jest.fn()
  }
}));

jest.mock('../utils/db.utils', () => ({
  retrieveChatHistory: jest.fn()
}));

const mockedAiChat = aiChat as jest.MockedFunction<typeof aiChat>;

describe('chatNoSave', () => {
  beforeEach(() => {
    mockedAiChat.mockClear();
  });

  it('forwards stream flag and callback to aiChat when streaming', async () => {
    const provider = { name: 'openai' } as AIProvider;
    const callback = jest.fn();

    await chatNoSave('Hello', provider, true, { topic: 'test' }, true, callback);

    expect(mockedAiChat).toHaveBeenCalledTimes(1);

    const [messagesArg, providerArg, assistantArg, contextArg, streamArg, callbackArg] = mockedAiChat.mock.calls[0];

    expect(messagesArg[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(providerArg).toBe(provider);
    expect(assistantArg).toBe(true);
    expect(contextArg).toEqual({ topic: 'test' });
    expect(streamArg).toBe(true);
    expect(callbackArg).toBe(callback);
  });
});
