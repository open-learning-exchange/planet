import { resourceDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { Attachment, DbDoc } from '../models/db-doc.model';

export const isUserConversationOwner = (doc: Pick<DbDoc, 'user'>, session: SessionInfo): boolean => doc.user === session.name;

// nano sends `_design`/`_local` ids unencoded, so `_design/../<db>/<id>` would reach other databases as the gateway's admin
export const isPlainDocId = (id: unknown): id is string => typeof id === 'string' && /^[^_/][^/]*$/.test(id);

export async function fetchResourceAttachments(docId: string): Promise<Record<string, Attachment>> {
  const doc = await resourceDB.get(docId) as { _attachments?: Record<string, Attachment> };
  return doc._attachments || {};
}

export function streamResourceAttachment(docId: string, attachmentName: string): NodeJS.ReadableStream {
  return resourceDB.attachment.getAsStream(docId, encodeURIComponent(attachmentName));
}
