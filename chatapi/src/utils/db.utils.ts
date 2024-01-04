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
    return {
      'conversations': res.conversations,
      'title': res.title,
      'createdDate': res.createdDate,
    };
    // Should return user, team data as well particularly for the "/conversations" endpoint
  } catch (error) {
    return {
      'conversations': [],
      'title': ''
    };
  }
}

export async function retrieveChatHistory(dbData: any, messages: ChatMessage[]) {
  const { conversations, title, createdDate } = await getChatDocument(dbData._id);
  dbData.conversations = conversations;
  dbData.title = title;
  dbData.createdDate = createdDate;

  for (const { query, response } of conversations) {
    messages.push({ 'role': 'user', 'content': query });
    messages.push({ 'role': 'assistant', 'content': response });
  }
}
