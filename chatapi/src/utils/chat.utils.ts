import { aiChatStream, aiChatNonStream } from './chat-helpers.utils';
import { AIProvider, ChatMessage, ChatResponse } from '../models/chat.model';

export async function aiChat(
  messages: ChatMessage[],
  aiProvider: AIProvider,
  context?: any,
  stream?: boolean,
  callback?: (response: string) => void
): Promise<ChatResponse | string> {
  if (stream) {
    return await aiChatStream(messages, aiProvider, context, callback);
  } else {
    return await aiChatNonStream(messages, aiProvider, context);
  }
}
