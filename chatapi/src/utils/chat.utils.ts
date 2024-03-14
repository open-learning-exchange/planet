import openai from '../config/openai.config';
import perplexity from '../config/perplexity.config';
import gemini from '../config/gemini.config';
import { AIProvider, ProviderName } from '../models/aiProviders.model';
import { ChatMessage } from '../models/chat-message.model';

/**
 * Uses openai's createChatCompletion endpoint to generate chat completions
 * @param messages - Array of chat messages
 * @returns Completion text
 */
export async function aiChat(messages: ChatMessage[], aiProvider: AIProvider): Promise<string> {
  const providers: { [key in ProviderName]: { ai: any; defaultModel: string } } = {
    'openai': { 'ai': openai, 'defaultModel': 'gpt-3.5-turbo' },
    'perplexity': { 'ai': perplexity, 'defaultModel': 'pplx-7b-online' },
    'gemini': { 'ai': gemini, 'defaultModel': 'gemini-pro' },
  };

  const provider = providers[aiProvider.name];

  if (!provider) {
    throw new Error('Unsupported AI provider');
  }

  const model = aiProvider.model || provider.defaultModel;
  console.log(messages);


  if (provider.ai === gemini) {
    const geminiModel = gemini.getGenerativeModel({ model });

    const result = await geminiModel.generateContent('Hello, who are you?');
    const response = await result.response;
    const text = response.text();

    return text;
  } else {
    const completion = await provider.ai.chat.completions.create({
      model,
      messages,
    });

    const completionText = completion.choices[0]?.message?.content;
    if (!completionText) {
      throw new Error('Unexpected API response');
    }

    return completionText;
  }
}
