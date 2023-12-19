import openai from '../config/openai.config';
import { ChatMessage } from '../models/chat-message.model';


async function gptChatStream(messages: ChatMessage[], callback?: (response: string) => void) {
  let completionText = '';
  const completion = await openai.chat.completions.create({
    'model': 'gpt-3.5-turbo',
    messages,
    'stream': true
  });

  for await (const chunk of completion) {
    if (chunk.choices && chunk.choices.length > 0) {
      const response = chunk.choices[0].delta?.content || '';
      completionText += response;
      if (callback) {
        callback(response);
      }
    }
  }
  return completionText;
}

async function gptChatNonStream(messages: ChatMessage[]) {
  const completion = await openai.chat.completions.create({
    'model': 'gpt-3.5-turbo',
    messages,
  });

  if (!completion.choices[0]?.message?.content) {
    throw new Error('Unexpected API response');
  }

  return completion.choices[0]?.message?.content;
}

export async function gptChat(messages: ChatMessage[], stream?: boolean, callback?: (response: string) => void): Promise<string> {
  if (stream) {
    return await gptChatStream(messages, callback);
  } else {
    return await gptChatNonStream(messages);
  }
}
