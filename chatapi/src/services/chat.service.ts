import { DocumentInsertResponse } from 'nano';

import { chatDB } from '../config/nano.config';
import { retrieveChatHistory } from '../utils/db.utils';
import { aiChat } from '../utils/chat.utils';
import { handleChatError } from '../utils/chat-error.utils';
import { AIProvider, ChatMessage } from '../models/chat.model';

/**
 * Create a chat conversation & save in couchdb
 * @param data - Chat data including content and additional information
 * @param stream - Boolean to set streaming on or off
 * @param callback - Callback function used when streaming is enabled
 * @returns Object with completion text and CouchDB save response
 */
export async function chat(data: any, stream?: boolean, callback?: (response: string) => void): Promise<{
  completionText: string;
  couchSaveResponse: DocumentInsertResponse;
} | undefined> {
  const { content, ...dbData } = data;
  const messages: ChatMessage[] = [];
  const aiProvider = dbData.aiProvider as AIProvider || { 'name': 'openai' };

  if (!content || typeof content !== 'string') {
    throw new Error('"data.content" is a required non-empty string field');
  }

  if (dbData._id) {
    await retrieveChatHistory(dbData, messages);
  } else {
    dbData.title = content;
    dbData.conversations = [];
    dbData.createdDate = Date.now();
    dbData.aiProvider = aiProvider.name;
  }

  dbData.conversations.push({ 'query': content, 'response': '' });
  const res = await chatDB.insert(dbData);

  messages.push({ 'role': 'user', content });

  try {
    const completionText = await aiChat(messages, aiProvider, dbData.assistant, dbData.context, stream, callback);

    dbData.conversations[dbData.conversations.length - 1].response = completionText;

    dbData.updatedDate = Date.now();
    dbData._id = res?.id;
    dbData._rev = res?.rev;
    const couchSaveResponse = await chatDB.insert(dbData);

    return {
      completionText,
      couchSaveResponse
    };
  } catch (error: any) {
    handleChatError(error);
  }
}

export async function chatNoSave(
  content: any,
  aiProvider: AIProvider,
  assistant: boolean,
  context?: any,
  stream?: boolean,
  callback?: (response: string) => void
): Promise<string | undefined> {
  const messages: ChatMessage[] = [];

  messages.push({ 'role': 'user', content });

  try {
    const completionText = await aiChat(messages, aiProvider, assistant, context, stream, callback);
    messages.push({
      'role': 'assistant', 'content': completionText
    });

    return completionText;
  } catch (error: any) {
    handleChatError(error);
  }
}
