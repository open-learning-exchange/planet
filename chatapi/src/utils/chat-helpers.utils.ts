import openai from '../config/openai.config';
import perplexity from '../config/perplexity.config';
import gemini from '../config/gemini.config';
import { AIProvider, ProviderName } from '../models/ai-providers.model';
import { ChatMessage, GeminiMessage } from '../models/chat-message.model';

const providers: { [key in ProviderName]: { ai: any; defaultModel: string } } =
  {
    'openai': { 'ai': openai, 'defaultModel': 'gpt-3.5-turbo' },
    'perplexity': { 'ai': perplexity, 'defaultModel': 'pplx-7b-online' },
    'gemini': { 'ai': gemini, 'defaultModel': 'gemini-pro' },
  };


/**
 * Uses geminis's multimodal endpoint to generate chat completions
 * @param messages - Array of chat messages
 * @param model - Gemini model to use for completions
 * @returns Completion text
 */
async function handleGemini(
  messages: ChatMessage[],
  model: string
): Promise<string> {
  const geminiModel = gemini.getGenerativeModel({ model });

  const msg = messages[messages.length - 1].content;

  const geminiMessages: GeminiMessage[] = messages.map((message) => ({
    'role': message.role === 'assistant' ? 'model' : message.role,
    'parts': [{ 'text': message.content }],
  }));

  geminiMessages.pop();

  const chat = geminiModel.startChat({
    'history': geminiMessages,
    'generationConfig': {
      'maxOutputTokens': 100,
    },
  });

  const result = await chat.sendMessage(msg);
  const response = await result.response;
  const text = response.text();

  return text;
}



/**
 * Uses openai's completions endpoint to generate chat completions with streaming enabled
 * @param messages - Array of chat messages
 * @param aiProvider - AI provider option(openai, perplexity, gemini)
 * @returns Completion text
 */
export async function aiChatStream(
  messages: ChatMessage[],
  aiProvider: AIProvider,
  callback?: (response: string) => void
): Promise<string> {
  const provider = providers[aiProvider.name];
  if (!provider) {
    throw new Error('Unsupported AI provider');
  }
  const model = aiProvider.model ?? provider.defaultModel;

  if (aiProvider.name === 'gemini') {
    return handleGemini(messages, model);
  } else {
    const completion = await provider.ai.chat.completions.create({
      model,
      messages,
      'stream': true,
    });

    let completionText = '';
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
}



/**
 * Uses openai's completions endpoint to generate chat completions with streaming disabled
 * @param messages - Array of chat messages
 * @param aiProvider - AI provider option(openai, perplexity, gemini)
 * @returns Completion text
 */
export async function aiChatNonStream(
  messages: ChatMessage[],
  aiProvider: AIProvider
): Promise<string> {
  const provider = providers[aiProvider.name];
  if (!provider) {
    throw new Error('Unsupported AI provider');
  }
  const model = aiProvider.model ?? provider.defaultModel;

  if (aiProvider.name === 'gemini') {
    return handleGemini(messages, model);
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
