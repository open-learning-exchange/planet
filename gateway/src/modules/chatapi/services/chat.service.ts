import { DocumentInsertResponse } from 'nano';

import { chatDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { HttpError } from '../../../middleware/errors';
import { getConfiguration } from '../../../services/config.service';
import { isPlainDocId, isUserConversationOwner, retrieveChatHistory } from '../utils/db.utils';
import { aiChat } from '../utils/chat.utils';
import { AIProvider, ChatMessage } from '../models/chat.model';
import { ProviderClient, providerClient } from '../providers/clients';

const notOwner = () => new HttpError(403, 'Only the owner can continue this conversation');
const missing = (error: any): never => {
  throw error?.statusCode === 404 ? new HttpError(404, 'Conversation not found') : error;
};

async function checkTurn(content: unknown, aiProvider?: AIProvider): Promise<ProviderClient> {
  if (!content || typeof content !== 'string') {
    throw new HttpError(400, '"data.content" must be a non-empty string');
  }
  return providerClient(aiProvider || { 'name': 'openai' });
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
}> {
  const { content, context } = data;
  const messages: ChatMessage[] = [];

  const provider = await checkTurn(content, data.aiProvider);
  const { assistant } = await getConfiguration();
  let dbData: any;

  if (data._id) {
    if (!isPlainDocId(data._id)) {
      throw notOwner();
    }
    const stored = await retrieveChatHistory(data._id, messages).catch(missing);
    if (!isUserConversationOwner(stored, session)) {
      throw notOwner();
    }
    dbData = { ...stored, 'context': context ?? stored.context };
  } else {
    dbData = {
      'user': session.name,
      'title': content,
      'conversations': [],
      'createdDate': Date.now(),
      'aiProvider': provider.name,
      context
    };
  }

  dbData.conversations.push({ 'id': Date.now().toString(), 'query': content, 'response': '' });
  const res = await chatDB.insert(dbData);

  messages.push({ 'role': 'user', content });

  const completionText = await aiChat(messages, provider, assistant.instructions, dbData.context, stream, callback);

  dbData.conversations[dbData.conversations.length - 1].response = completionText;

  dbData.updatedDate = Date.now();
  dbData._id = res?.id;
  dbData._rev = res?.rev;
  const couchSaveResponse = await chatDB.insert(dbData);

  return {
    completionText,
    couchSaveResponse
  };
}

export async function chatNoSave(
  content: any,
  aiProvider?: AIProvider,
  context?: any
): Promise<string> {
  const provider = await checkTurn(content, aiProvider);
  const messages: ChatMessage[] = [];

  messages.push({ 'role': 'user', content });

  // One-off prompts such as survey analysis carry their own instructions, so they skip the Planet prompt
  return await aiChat(messages, provider, '', context);
}
