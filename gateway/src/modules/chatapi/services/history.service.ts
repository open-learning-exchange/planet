import { MangoResponse } from 'nano';

import { chatDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { DbDoc } from '../models/db-doc.model';
import { isPlainDocId, isUserConversationOwner } from '../utils/db.utils';

const PAGE_SIZE = 1000;

export type ConversationChange = { title: string } | { shared: true };

export interface ChatUsage {
  _id: string;
  user: string;
  createdDate: number;
  aiProvider?: string;
  assistant: boolean;
  shared: boolean;
  turns: number;
  hasAttachments: boolean;
}

export async function listConversations(session: SessionInfo): Promise<DbDoc[]> {
  const conversations: DbDoc[] = [];
  let page: MangoResponse<DbDoc> | undefined;
  do {
    const query = { 'selector': { 'user': session.name }, 'limit': PAGE_SIZE, 'bookmark': page?.bookmark };
    page = await chatDB.find(query) as MangoResponse<DbDoc>;
    conversations.push(...page.docs);
  } while (page.docs.length === PAGE_SIZE);
  return conversations;
}

export async function getConversation(id: string, session: SessionInfo): Promise<DbDoc | undefined> {
  if (!isPlainDocId(id)) {
    return undefined;
  }
  try {
    const doc = await chatDB.get(id) as DbDoc;
    return isUserConversationOwner(doc, session) ? doc : undefined;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return undefined;
    }
    throw error;
  }
}

export const conversationChange = ({ title, shared }: any = {}): ConversationChange | undefined => {
  if (typeof title === 'string' && title.trim()) {
    return { title };
  }
  return shared === true ? { shared } : undefined;
};

export async function updateConversation(id: string, session: SessionInfo, change: ConversationChange): Promise<DbDoc | undefined> {
  const doc = await getConversation(id, session);
  if (!doc) {
    return undefined;
  }
  const updated = { ...doc, ...change, 'updatedDate': Date.now() };
  const { rev } = await chatDB.insert(updated);
  return { ...updated, '_rev': rev };
}

export async function chatUsage(): Promise<ChatUsage[]> {
  const { rows } = await chatDB.list({ 'include_docs': true });
  return rows.filter((row) => !row.id.startsWith('_design/')).map((row) => {
    const doc = row.doc as DbDoc;
    return {
      '_id': doc._id,
      'user': doc.user,
      'createdDate': doc.createdDate,
      'aiProvider': doc.aiProvider,
      'assistant': !!doc.assistant,
      'shared': !!doc.shared,
      'turns': doc.conversations?.length || 0,
      // The course step stores the resource's `_attachments` object, not a list
      'hasAttachments': Object.keys(doc.context?.resource?.attachments || {}).length > 0
    };
  });
}
