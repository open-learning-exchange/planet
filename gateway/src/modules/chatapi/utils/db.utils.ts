import { chatDB, resourceDB } from '../../../config/couch.config';
import { Attachment, DbDoc } from '../models/db-doc.model';
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
    'aiProvider': res.aiProvider,
    'user': res.user
  };
}

export async function retrieveChatHistory(dbData: any, messages: ChatMessage[]) {
  const stored = await getChatDocument(dbData._id);
  const { conversations, title, createdDate, aiProvider } = stored;
  dbData.conversations = conversations;
  dbData.title = title;
  dbData.createdDate = createdDate;
  dbData.aiProvider = aiProvider;

  for (const { query, response } of conversations) {
    messages.push({ 'role': 'user', 'content': query });
    messages.push({ 'role': 'assistant', 'content': response });
  }
  return stored;
}

// nano sends `_design`/`_local` ids unencoded, so `_design/../<db>/<id>` would reach other databases as the gateway's admin
export const isPlainDocId = (id: unknown): id is string => typeof id === 'string' && /^[^_/][^/]*$/.test(id);

export async function fetchResourceAttachments(docId: string): Promise<Record<string, Attachment>> {
  const doc = await resourceDB.get(docId) as { _attachments?: Record<string, Attachment> };
  return doc._attachments || {};
}

export function streamResourceAttachment(docId: string, attachmentName: string): NodeJS.ReadableStream {
  return resourceDB.attachment.getAsStream(docId, encodeURIComponent(attachmentName));
}
