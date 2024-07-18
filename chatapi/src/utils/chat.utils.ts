import { aiChatStream, aiChatNonStream } from './chat-helpers.utils';

import { AIProvider } from '../models/ai-providers.model';
import { ChatMessage } from '../models/chat-message.model';

export async function aiChat(
  messages: ChatMessage[],
  aiProvider: AIProvider,
  assistant: boolean,
  stream?: boolean,
  callback?: (response: string) => void
): Promise<string> {
  if (stream) {
    return await aiChatStream(messages, aiProvider, assistant, callback);
  } else {
    return await aiChatNonStream(messages, aiProvider, assistant);
  }
}
