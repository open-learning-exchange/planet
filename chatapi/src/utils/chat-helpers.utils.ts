import { gemini } from '../config/ai-providers.config';
import { models } from '../config/ai-providers.config';
import { AIProvider } from '../models/ai-providers.model';
import { ChatMessage, GeminiMessage } from '../models/chat-message.model';
import { Attachment } from '../models/db-doc.model';
import { fetchFileFromCouchDB } from './db.utils';
import {
  createAssistant,
  createThread,
  addToThread,
  createRun,
  waitForRunCompletion,
  retrieveResponse,
  createAndHandleRunWithStreaming,
} from './chat-assistant.utils';
import { extractTextFromDocument } from './text-extraction.utils';

// const getProviders = async () => await initializeProviderModels();

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
  callback?: (response: string) => void
): Promise<string> {
  const provider = models[aiProvider.name];
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
  } else if ('chat' in provider.ai) {
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
  } else {
    throw new Error('Provider does not support chat completions');
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
  context: any = '',
): Promise<string> {
  const provider = models[aiProvider.name];
  if (!provider) {
    throw new Error('Unsupported AI provider');
  }
  const model = aiProvider.model ?? provider.defaultModel;

  if(context.resource) {
    for (const [attachmentName, attachment] of Object.entries(context.resource.attachments)) {
      const typedAttachment = attachment as Attachment;
      const contentType = typedAttachment.content_type;

      const file = await fetchFileFromCouchDB(context.resource.id, attachmentName);
      const text = await extractTextFromDocument(file as Buffer, contentType);
      context.data += text;
    }
  }

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
  } else if ('chat' in provider.ai) {
    const completion = await provider.ai.chat.completions.create({
      model,
      messages,
    });

    const completionText = completion.choices[0]?.message?.content;
    if (!completionText) {
      throw new Error('Unexpected API response');
    }

    return completionText;
  } else {
    throw new Error('Provider does not support chat completions');
  }
}
