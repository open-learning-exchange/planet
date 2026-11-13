import { DocumentInsertResponse } from 'nano';

import { chatDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { ConfigurationUnavailableError, getConfiguration } from '../../../services/config.service';
import { isPlainDocId, isUserConversationOwner, retrieveChatHistory } from '../utils/db.utils';
import { aiChat } from '../utils/chat.utils';
import { AIProvider, ChatMessage } from '../models/chat.model';

export class ConversationAccessError extends Error {
  constructor() {
    super('Only the owner can continue this conversation');
    this.name = 'ConversationAccessError';
  }
}

function handleChatError(error: any) {
  if (error instanceof ConfigurationUnavailableError) {
    throw error;
  }
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
  const { content, context } = data;
  const messages: ChatMessage[] = [];
  const aiProvider = data.aiProvider as AIProvider || { 'name': 'openai' };

  if (!content || typeof content !== 'string') {
    throw new Error('"data.content" is a required non-empty string field');
  }

  const { assistant } = await getConfiguration();
  let dbData: any;

  if (data._id) {
    if (!isPlainDocId(data._id)) {
      throw new ConversationAccessError();
    }
    const stored = await retrieveChatHistory(data._id, messages);
    if (!isUserConversationOwner(stored, session)) {
      throw new ConversationAccessError();
    }
    dbData = { ...stored, 'context': context ?? stored.context };
  } else {
    dbData = {
      'user': session.name,
      'title': content,
      'conversations': [],
      'createdDate': Date.now(),
      'aiProvider': aiProvider.name,
      context
    };
  }

  dbData.conversations.push({ 'id': Date.now().toString(), 'query': content, 'response': '' });
  const res = await chatDB.insert(dbData);

  messages.push({ 'role': 'user', content });

  try {
    const completionText = await aiChat(messages, aiProvider, assistant.instructions, dbData.context, stream, callback);

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
  context?: any
): Promise<string | undefined> {
  const messages: ChatMessage[] = [];

  messages.push({ 'role': 'user', content });

  try {
    // One-off prompts such as survey analysis carry their own instructions, so they skip the Planet prompt
    const completionText = await aiChat(messages, aiProvider, '', context);
    return completionText;
  } catch (error: any) {
    handleChatError(error);
  }
}
