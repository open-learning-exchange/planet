import openai from '../config/openai.config';
import perplexity from '../config/perplexity.config';
import gemini from '../config/gemini.config';
import { AIProvider, ProviderName } from '../models/ai-providers.model';
import { ChatMessage, GeminiMessage } from '../models/chat-message.model';
import {
  createAssistant,
  createThread,
  addToThread,
  createRun,
  waitForRunCompletion,
  retrieveResponse,
  createAndHandleRunWithStreaming,
} from './chat-assistant.utils';

const modelsConfig = JSON.parse(process.env.MODELS_CONFIG || '{}');

const providers: { [key in ProviderName]: { ai: any; defaultModel: string } } =
  {
    'openai': { 'ai': openai, 'defaultModel': modelsConfig.openai || 'gpt-3.5-turbo' },
    'perplexity': { 'ai': perplexity, 'defaultModel': modelsConfig.perplexity || 'llama-3-sonar-small-32k-online' },
    'gemini': { 'ai': gemini, 'defaultModel': modelsConfig.gemini || 'gemini-pro' },
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
  const completionText = response.text();

  return completionText;
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
  assistant: boolean,
  context: any,
  callback?: (response: string) => void
): Promise<string> {
  const provider = providers[aiProvider.name];
  if (!provider) {
    throw new Error('Unsupported AI provider');
  }
  const model = aiProvider.model ?? provider.defaultModel;

  if (assistant) {
    try {
      const asst = await createAssistant(model);
      const thread = await createThread();
      for (const message of messages) {
        await addToThread(thread.id, message.content);
      }

      const completionText = await createAndHandleRunWithStreaming(thread.id, asst.id, callback);

      return completionText;
    } catch (error) {
      throw new Error('Error processing request');
    }
  }

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
  aiProvider: AIProvider,
  assistant: boolean,
  context: any,
): Promise<string> {
  const provider = providers[aiProvider.name];
  if (!provider) {
    throw new Error('Unsupported AI provider');
  }
  const model = aiProvider.model ?? provider.defaultModel;

  if(assistant) {
    try {
      const asst = await createAssistant(model);
      const thread = await createThread();
      for (const message of messages) {
        await addToThread(thread.id, message.content);
      }
      const run = await createRun(thread.id, asst.id, context.data);
      await waitForRunCompletion(thread.id, run.id);

      return await retrieveResponse(thread.id);
    } catch (error) {
      return 'Error processing request';
    }
  }

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
