import openai from '../config/openai.config';
import perplexity from '../config/perplexity.config';
import { ChatMessage } from '../models/chat-message.model';

/**
 * Uses openai's createChatCompletion endpoint to generate chat completions
 * @param messages - Array of chat messages
 * @returns Completion text
 */
export async function gptChat(messages: ChatMessage[], usePerplexity: boolean): Promise<string> {
  const ai = usePerplexity ? perplexity : openai;
  const completion = await ai.chat.completions.create({
    'model': usePerplexity ? 'mistral-7b-instruct' : 'gpt-3.5-turbo',
    messages,
  });

  const completionText = completion.choices[0]?.message?.content;
  if (!completionText) {
    throw new Error('Unexpected API response');
  }

  return completionText;
}
