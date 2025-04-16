import { models } from '../config/ai-providers.config';
import { AIProvider, ChatMessage } from '../models/chat.model';
import {
  createAssistant,
  createThread,
  addToThread,
  createRun,
  waitForRunCompletion,
  retrieveResponse,
  createAndHandleRunWithStreaming,
  processAttachments
} from './chat-assistant.utils';

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

  if (assistant) {
    if (context.resource && context.resource.attachments) {
      try {
        const fsAsst = await createAssistant(model, [
          { 'type': 'code_interpreter' },
          { 'type': 'file_search' },
        ]);

        const attachments = await processAttachments(context, fsAsst.id);
        const thread = await createThread();

        if (messages.length > 0 && (attachments ?? []).length > 0) {
          await addToThread(thread.id, messages[0].content, attachments);
          for (let i = 1; i < messages.length; i++) {
            await addToThread(thread.id, messages[i].content);
          }
        } else {
          for (const message of messages) {
            await addToThread(thread.id, message.content);
          }
        }

        const run = await createRun(thread.id, fsAsst.id, context.data);
        await waitForRunCompletion(thread.id, run.id);

        return await retrieveResponse(thread.id);
      } catch (error) {
        throw new Error(`Error processing file attachments: ${error}`);
      }
    }


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
