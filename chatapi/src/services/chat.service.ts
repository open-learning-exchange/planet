import { DocumentInsertResponse } from 'nano';

import db from '../config/nano.config';
import { gptChat } from '../utils/gpt-chat.utils';
import { retrieveChatHistory } from '../utils/db.utils';
import { handleChatError } from '../utils/chat-error.utils';
import { ChatMessage } from '../models/chat-message.model';

/**
 * Create a chat conversation & save in couchdb
 * @param data - Chat data including content and additional information
 * @returns Object with completion text and CouchDB save response
 */
export async function chat(data: any): Promise<{
  completionText: string;
  couchSaveResponse: DocumentInsertResponse;
} | undefined> {
  const { content, ...dbData } = data;
  const messages: ChatMessage[] = [];

  if (dbData._id) {
    await retrieveChatHistory(dbData, messages);
  } else {
    dbData.conversations = [];
  }

  dbData.conversations.push({ 'query': content, 'response': '' });
  const res = await db.insert(dbData);

  messages.push({ 'role': 'user', content });

  try {
    const completionText = await gptChat(messages);

    dbData.conversations[dbData.conversations.length - 1].response = completionText;

    dbData._id = res?.id;
    dbData._rev = res?.rev;
    const couchSaveResponse = await db.insert(dbData);

    return {
      completionText,
      couchSaveResponse
    };
  } catch (error: any) {
    handleChatError(error);
  }
}

export async function chatNoSave(content: any): Promise< string | undefined> {
  const messages: ChatMessage[] = [];

  messages.push({ 'role': 'user', content });

  try {
    const completionText = await gptChat(messages);
    messages.push({
      'role': 'assistant', 'content': completionText
    });

    return completionText;
  } catch (error: any) {
    handleChatError(error);
  }
}
