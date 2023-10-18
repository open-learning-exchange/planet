import openai from '../config/openai.config';
import { ChatMessage } from '../models/chat-message.model';

/**
 * Uses openai's createChatCompletion endpoint to generate chat completions
 * @param messages - Array of chat messages
 * @returns Completion text
 */
export async function gptChat(
  messages: ChatMessage[],
  stream?: boolean,
  callback?: (response: string) => void): Promise<string> {
  let completionText = '';

  if (stream) {
    const completion = await openai.chat.completions.create({
      'model': 'gpt-3.5-turbo',
      messages,
      stream
    });

    // Handle streaming data
    for await (const chunk of completion) {
      if (chunk.choices && chunk.choices.length > 0) {
        const response = chunk.choices[0].delta?.content || '';
        completionText += response;
        if (callback) {
          callback(response);
        }

        if (callback && chunk.choices[0].finish_reason === 'stop') {
          callback('[DONE]');
        }
      }
    }
  } else {
    const completion = await openai.chat.completions.create({
      'model': 'gpt-3.5-turbo',
      messages,
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error('Unexpected API response');
    }

    completionText = completion.choices[0]?.message?.content;
  }

  if (!completionText) {
    throw new Error('Unexpected API response');
  }

  return completionText;
}
