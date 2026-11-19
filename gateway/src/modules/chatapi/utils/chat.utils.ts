import { aiChatStream, aiChatNonStream } from './chat-helpers.utils';
import { ChatMessage } from '../models/chat.model';
import { ProviderClient } from '../providers/clients';

export async function aiChat(
  messages: ChatMessage[],
  provider: ProviderClient,
  instructions: string,
  context?: any,
  stream?: boolean,
  callback?: (response: string) => void
): Promise<string> {
  if (stream) {
    return await aiChatStream(messages, provider, instructions, context, callback);
  } else {
    return await aiChatNonStream(messages, provider, instructions, context);
  }
}
