import db from '../config/nano.config';
import { DbDoc } from '../models/db-doc.model';
import { ChatMessage } from '../models/chat-message.model';

/**
 * Retrieves chat history from CouchDB for a given document ID.
 * @param id - Document ID
 * @returns Array of chat conversations
 */
async function getChatDocument(id: string) {
  try {
    const res = await db.get(id) as DbDoc;
    return res.conversations;
    // Should return user, team data as well particularly for the /conversations endpoint
  } catch (error) {
    return [];
  }
}

export async function retrieveChatHistory(dbData: any, messages: ChatMessage[]) {
  const history = await getChatDocument(dbData._id);
  dbData.conversations = history;

  for (const { query, response } of history) {
    messages.push({ 'role': 'user', 'content': query });
    messages.push({ 'role': 'assistant', 'content': response });
  }
}
