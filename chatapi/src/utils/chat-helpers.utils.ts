import { models } from '../config/ai-providers.config';
import { AIProvider, ChatMessage } from '../models/chat.model';
import { Attachment } from '../models/db-doc.model';
import { fetchFileFromCouchDB } from './db.utils';
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
  context: any,
  callback?: (response: string) => void
): Promise<string> {
  const provider = models[aiProvider.name];
  if (!provider) {
    throw new Error('Unsupported AI provider');
  }
  const model = aiProvider.model ?? provider.defaultModel;

  const stream = await provider.ai.responses.create({
    model,
    'instructions': context.data || '',
    'input': messages,
    'stream': true,
  });

  let completionText = '';
  for await (const chunk of stream) {
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
  context: any,
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

  const response = await provider.ai.responses.create({
    model,
    'instructions': context.data || '',
    'input': messages,
  });

  const responseText = response.output_text;
  if (!responseText) {
    throw new Error('Unexpected API response');
  }

  return responseText;
}
