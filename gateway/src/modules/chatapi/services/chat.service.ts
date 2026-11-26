import { DocumentInsertResponse } from 'nano';

import { chatDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { HttpError } from '../../../middleware/errors';
import { getConfiguration } from '../../../services/config.service';
import { isPlainDocId, isUserConversationOwner } from '../utils/db.utils';
import { aiChat } from '../utils/chat.utils';
import { AIProvider, ChatItem, ChatMessage } from '../models/chat.model';
import { DbDoc } from '../models/db-doc.model';
import { ProviderClient, providerClient } from '../providers/clients';

const MAX_TURNS = 40;
const TITLE_MAX_LENGTH = 60;

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

async function openConversation(id: string, session: SessionInfo): Promise<DbDoc> {
  const doc = await chatDB.get(id).catch(missing) as DbDoc;
  if (!isUserConversationOwner(doc, session)) {
    throw notOwner();
  }
  if (doc.conversations.length >= MAX_TURNS) {
    throw new HttpError(
      409, `This conversation has reached its ${MAX_TURNS}-turn limit; start a new one to continue`, 'conversation_turn_limit'
    );
  }
  return doc;
}

const historyMessages = (turns: ChatItem[]): ChatMessage[] => turns.flatMap(({ query, response }) => [
  { 'role': 'user' as const, 'content': query },
  { 'role': 'assistant' as const, 'content': response }
]);

// By code point: CouchDB refuses a title ending in half an emoji
const truncateTitle = (content: string): string => {
  const characters = Array.from(content);
  return characters.length > TITLE_MAX_LENGTH ? `${characters.slice(0, TITLE_MAX_LENGTH - 1).join('')}…` : content;
};

async function addTurn(stored: DbDoc, session: SessionInfo, change: Partial<DbDoc>, turn: ChatItem): Promise<DocumentInsertResponse> {
  const withTurn = (doc: DbDoc) => ({
    ...doc, ...change, 'context': change.context ?? doc.context, 'conversations': [ ...doc.conversations, turn ], 'updatedDate': Date.now()
  });
  try {
    return await chatDB.insert(withTurn(stored));
  } catch (error: any) {
    if (error?.statusCode !== 409) {
      throw error;
    }
    return await chatDB.insert(withTurn(await openConversation(stored._id, session)));
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
}> {
  const { content } = data;
  const provider = await checkTurn(content, data.aiProvider);
  const { promptProfiles } = await getConfiguration();

  if (data._id && !isPlainDocId(data._id)) {
    throw notOwner();
  }
  const stored = data._id ? await openConversation(data._id, session) : undefined;
  const context = data.context ?? stored?.context;
  const messages: ChatMessage[] = [ ...historyMessages(stored?.conversations || []), { 'role': 'user', content } ];

  const completionText = await aiChat(messages, provider, promptProfiles.general_chat, context, stream, callback);

  const turn: ChatItem = { 'id': Date.now().toString(), 'query': content, 'response': completionText };
  const change = { 'aiProvider': provider.name, 'context': data.context };
  if (stored) {
    return { completionText, 'couchSaveResponse': await addTurn(stored, session, change, turn) };
  }
  const created: Partial<DbDoc> = {
    ...change, 'user': session.name, 'title': truncateTitle(content), 'conversations': [ turn ], 'createdDate': Date.now()
  };
  return { completionText, 'couchSaveResponse': await chatDB.insert(created) };
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
