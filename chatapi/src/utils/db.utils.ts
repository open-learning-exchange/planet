import { chatDB, resourceDB } from '../config/nano.config';
import { DbDoc } from '../models/db-doc.model';
import { ChatMessage } from '../models/chat.model';

/**
 * Retrieves chat history from CouchDB for a given document ID.
 * @param id - Document ID
 * @returns Array of chat conversations
 */
async function getChatDocument(id: string) {
  const res = await chatDB.get(id) as DbDoc;
  return {
    'conversations': res.conversations,
    'title': res.title,
    'createdDate': res.createdDate,
    'aiProvider': res.aiProvider
  };
  // Should return user, team data as well particularly for the "/conversations" endpoint
}

export async function retrieveChatHistory(dbData: any, messages: ChatMessage[]) {
  const { conversations, title, createdDate, aiProvider } = await getChatDocument(dbData._id);
  dbData.conversations = conversations;
  dbData.title = title;
  dbData.createdDate = createdDate;
  dbData.aiProvider = aiProvider;

  for (const { query, response } of conversations) {
    messages.push({ 'role': 'user', 'content': query });
    messages.push({ 'role': 'assistant', 'content': response });
  }
}

export async function fetchFileFromCouchDB(docId: string, attachmentName: string) {
  try {
    return await resourceDB.attachment.get(docId, attachmentName);
  } catch (error) {
    return {
      'error': 'Unable to retrieve file from CouchDB'
    };
  }
}
