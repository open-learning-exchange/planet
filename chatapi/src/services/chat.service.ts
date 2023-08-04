import { DocumentInsertResponse } from 'nano';

import db from '../config/nano.config';
import { gptChat } from '../utils/gpt-chat.utils';
import { getChatDocument } from '../utils/db.utils';
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
  const { content, user, time, teamId, teamType, ...dbData } = data;
  const messages: ChatMessage[] = [];

  if(dbData._id) {
    const history = await getChatDocument(dbData._id);
    dbData.conversations = history;

    for (const { query, response } of history) {
      messages.push({ 'role': 'user', 'content': query });
      messages.push({ 'role': 'assistant', 'content': response });
    }
  } else {
    dbData.conversations = [];
    dbData.user = user;
    dbData.time = time;

    if(teamId) dbData.teamId = teamId;
    if(teamType) dbData.teamType = teamType;
  }

  dbData.conversations.push({ 'query': content, 'response': '' });
  const res = await db.insert(dbData);

  messages.push({ 'role': 'user', content });

  try {
    const completionText = await gptChat(messages);

    dbData.conversations.pop();
    dbData.conversations.push({ 'query': content, 'response': completionText });

    dbData._id = res?.id;
    dbData._rev = res?.rev;
    const couchSaveResponse = await db.insert(dbData);

    return {
      completionText,
      couchSaveResponse
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(`GPT Service Error: ${error.response.status} - ${error.response.data?.error?.code}`);
    } else {
      throw new Error(error.message);
    }
  }
}
