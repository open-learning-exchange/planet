import { aiChatStream, aiChatNonStream } from './chat-helpers.utils';
import { AIProvider, ChatMessage } from '../models/chat.model';

export async function aiChat(
  messages: ChatMessage[],
  aiProvider: AIProvider,
  instructions: string,
  context?: any,
  stream?: boolean,
  callback?: (response: string) => void
): Promise<string> {
  if (stream) {
    return await aiChatStream(messages, aiProvider, instructions, context, callback);
  } else {
    return await aiChatNonStream(messages, aiProvider, instructions, context);
  }
}
