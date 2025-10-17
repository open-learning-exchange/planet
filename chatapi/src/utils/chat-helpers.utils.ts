import { models } from '../config/ai-providers.config';
import { AIProvider, ChatMessage } from '../models/chat.model';
import { Attachment } from '../models/db-doc.model';
import { fetchFileFromCouchDB } from './db.utils';
import {
  buildAssistantResponseParams,
  createAssistantResponse,
  createAssistantResponseStream,
} from './chat-assistant.utils';
import { extractTextFromDocument } from './text-extraction.utils';

/**
 * Uses openai's completions endpoint to generate chat completions with streaming enabled
 * @param messages - Array of chat messages
 * @param aiProvider - AI provider option
 * @returns Completion text
 */
export async function aiChatStream(
  messages: ChatMessage[],
  aiProvider: AIProvider,
  assistant: boolean,
  context: any = '',
  callback?: (response: string) => void
): Promise<string> {
  const provider = models[aiProvider.name];
  if (!provider) {
    throw new Error('Unsupported AI provider');
  }
  const model = aiProvider.model ?? provider.defaultModel;

  const contextData = typeof context === 'string' ? context : context?.data;

  if (assistant) {
    try {
      const params = buildAssistantResponseParams(messages, model, contextData);
      return await createAssistantResponseStream(params, callback);
    } catch (error) {
      throw new Error(`Error processing request ${error}`);
    }
  }

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


/**
 * Uses openai's completions endpoint to generate chat completions with streaming disabled
 * @param messages - Array of chat messages
 * @param aiProvider - AI provider option
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

  if (context.resource && context.resource.attachments) {
    for (const [ attachmentName, attachment ] of Object.entries(context.resource.attachments)) {
      const typedAttachment = attachment as Attachment;
      const contentType = typedAttachment.content_type;

      if (contentType === 'application/pdf') {
        const file = await fetchFileFromCouchDB(context.resource.id, attachmentName);
        const text = await extractTextFromDocument(file as Buffer, contentType);
        context.data += text;
      }
    }
  }

  const contextData = typeof context === 'string' ? context : context?.data;

  if (assistant) {
    try {
      const params = buildAssistantResponseParams(messages, model, contextData);
      return await createAssistantResponse(params);
    } catch (error) {
      throw new Error(`Error processing request ${error}`);
    }
  }

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
