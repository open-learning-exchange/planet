import { DocumentInsertResponse } from 'nano';

import { chatDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { retrieveChatHistory } from '../utils/db.utils';
import { aiChat } from '../utils/chat.utils';
import { AIProvider, ChatMessage } from '../models/chat.model';
import { DbDoc } from '../models/db-doc.model';

export class ConversationAccessError extends Error {
  constructor() {
    super('Only the owner can continue this conversation');
    this.name = 'ConversationAccessError';
  }
}

/** Only the owner adds turns to a conversation; anyone else forks a shared copy instead. */
export const canContinue = (doc: Pick<DbDoc, 'user'>, session: SessionInfo): boolean => doc.user === session.name;

// nano sends `_design`/`_local` ids unencoded, so `_design/../<id>` would read one doc and then write a design doc
const isConversationId = (id: unknown): boolean => typeof id === 'string' && /^[^_/][^/]*$/.test(id);

function handleChatError(error: any) {
  if (error.response) {
    throw new Error(`GPT Service Error: ${error.response.status} - ${error.response.data?.error?.code}`);
  } else {
    throw new Error(error.message);
  }
}

/**
 * Create a chat conversation & save in couchdb
 * @param data - Chat data including content and additional information
 * @param session - The member chatting, from the gateway's session check
 * @param stream - Boolean to set streaming on or off
 * @param callback - Callback function used when streaming is enabled
 * @returns Object with completion text and CouchDB save response
 */
export async function chat(data: any, session: SessionInfo, stream?: boolean, callback?: (response: string) => void): Promise<{
  completionText: string;
  couchSaveResponse: DocumentInsertResponse;
} | undefined> {
  const { content, ...dbData } = data;
  const messages: ChatMessage[] = [];
  const aiProvider = dbData.aiProvider as AIProvider || { 'name': 'openai' };

  if (!content || typeof content !== 'string') {
    throw new Error('"data.content" is a required non-empty string field');
  }

  dbData.user = session.name;

  if (dbData._id) {
    if (!isConversationId(dbData._id)) {
      throw new ConversationAccessError();
    }
    const stored = await retrieveChatHistory(dbData, messages);
    if (!canContinue(stored, session)) {
      throw new ConversationAccessError();
    }
  } else {
    dbData.title = content;
    dbData.conversations = [];
    dbData.createdDate = Date.now();
    dbData.aiProvider = aiProvider.name;
  }

  dbData.conversations.push({ 'id': Date.now().toString(), 'query': content, 'response': '' });
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
  context?: any
): Promise<string | undefined> {
  const messages: ChatMessage[] = [];

  messages.push({ 'role': 'user', content });

  try {
    const completionText = await aiChat(messages, aiProvider, assistant, context);
    return completionText;
  } catch (error: any) {
    handleChatError(error);
  }
}
