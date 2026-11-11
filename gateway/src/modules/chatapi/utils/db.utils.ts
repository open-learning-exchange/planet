import { chatDB, resourceDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { DbDoc } from '../models/db-doc.model';
import { ChatMessage } from '../models/chat.model';

export const isUserConversationOwner = (doc: Pick<DbDoc, 'user'>, session: SessionInfo): boolean => doc.user === session.name;

// nano sends `_design`/`_local` ids unencoded, so `_design/../<db>/<id>` would reach other databases as the gateway's admin
export const isPlainDocId = (id: unknown): id is string => typeof id === 'string' && /^[^_/][^/]*$/.test(id);

export async function retrieveChatHistory(id: string, messages: ChatMessage[]): Promise<DbDoc> {
  const stored = await chatDB.get(id) as DbDoc;
  for (const { query, response } of stored.conversations) {
    messages.push({ 'role': 'user', 'content': query });
    messages.push({ 'role': 'assistant', 'content': response });
  }
  return stored;
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
