import openai from '../config/openai.config';
import { ChatMessage } from '../models/chat-message.model';

/**
 * Uses openai's createChatCompletion endpoint to generate chat completions
 * @param messages - Array of chat messages
 * @returns Completion text
 */
export async function gptChat(messages: ChatMessage[]): Promise<string> {
  const completion = await openai.createChatCompletion({
    'model': 'gpt-3.5-turbo',
    messages,
  });

  const completionText = completion.data.choices[0]?.message?.content;
  if (!completionText) {
    throw new Error('Unexpected API response');
  }

  return completionText;
}
