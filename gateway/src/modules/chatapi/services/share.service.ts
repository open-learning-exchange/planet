import { randomUUID } from 'crypto';

import { chatDB, teamsDB } from '../../../config/couch.config';
import { SessionInfo } from '../../../middleware/auth';
import { HttpError } from '../../../middleware/errors';
import { getConfiguration } from '../../../services/config.service';
import { ChatItem } from '../models/chat.model';
import { ChatShare, DbDoc, ShareAudience } from '../models/db-doc.model';
import { truncateText } from '../utils/chat-helpers.utils';
import { isUserConversationOwner } from '../utils/db.utils';
import { getConversation } from './history.service';

const PREVIEW_TURNS = 2;
const PREVIEW_LENGTH = 300;
export const MAX_PREVIEW_IDS = 50;

export interface SharedChat {
  title: string;
  turns: Array<Pick<ChatItem, 'query' | 'response'>>;
  totalTurns: number;
  live: boolean;
  sharedDate: number;
}

export async function shareConversation(
  id: string, session: SessionInfo, audience: ShareAudience, live: boolean
): Promise<ChatShare | undefined> {
  const doc = await getConversation(id, session);
  if (!doc) {
    return undefined;
  }
  const share: ChatShare = {
    'id': randomUUID(),
    audience,
    ...(live ? {} : { 'turns': doc.conversations.length }),
    'sharedDate': Date.now()
  };
  const shared: DbDoc = { ...doc, 'shares': [ ...(doc.shares || []), share ] };
  await chatDB.insert(shared);
  return share;
}

// A missing view must not answer 404: the client takes that as already stopped
const sharesView = (params: { key?: string; keys?: string[] }) =>
  chatDB.view<null>('chat_history', 'shares', { ...params, 'include_docs': true }).catch((error) => {
    throw error?.statusCode === 404 ? new HttpError(503, 'Chat sharing is not set up on this server yet') : error;
  });

export async function stopSharing(shareId: string, session: SessionInfo): Promise<boolean> {
  const { rows } = await sharesView({ 'key': shareId });
  const doc = rows[0]?.doc as unknown as DbDoc | undefined;
  if (!doc || !isUserConversationOwner(doc, session)) {
    return false;
  }
  const unshared: DbDoc = { ...doc, 'shares': (doc.shares || []).filter((share) => share.id !== shareId) };
  await chatDB.insert(unshared);
  return true;
}

async function memberTeamIds(session: SessionInfo): Promise<Set<string>> {
  const { code } = await getConfiguration();
  const { docs } = await teamsDB.find({
    // Both membership shapes `getTeamsByUser` accepts
    'selector': { 'docType': 'membership', '$or': [
      { 'userId': `org.couchdb.user:${session.name}`, 'userPlanetCode': code },
      { 'userId': `org.couchdb.user:${session.name}@${code}` }
    ] },
    'fields': [ 'teamId' ],
    'limit': 1000
  });
  return new Set(docs.map((doc: any) => doc.teamId));
}

async function readableShares(ids: string[], session: SessionInfo): Promise<Array<{ doc: DbDoc; share: ChatShare }>> {
  const { rows } = await sharesView({ 'keys': ids });
  const found = rows.flatMap((row) => {
    const doc = row.doc as unknown as DbDoc;
    const share = doc?.shares?.find(({ id }) => id === row.key);
    return share ? [ { doc, share } ] : [];
  });
  const teamIds = found.some(({ share }) => share.audience.type === 'team') ? await memberTeamIds(session) : new Set<string>();
  return found.filter(({ share }) => share.audience.type === 'community' || teamIds.has(share.audience.teamId));
}

function sharedChat(doc: DbDoc, share: ChatShare, maxTurns?: number, maxLength?: number): SharedChat {
  const shared = doc.conversations.slice(0, share.turns ?? doc.conversations.length);
  const cut = (text: string) => maxLength ? truncateText(text, maxLength) : text;
  const turns = shared.slice(0, maxTurns).map(({ query, response }) => ({ 'query': cut(query), 'response': cut(response) }));
  return {
    'title': doc.title,
    turns,
    'totalTurns': shared.length,
    'live': share.turns === undefined,
    'sharedDate': share.sharedDate
  };
}

export async function sharePreviews(ids: string[], session: SessionInfo): Promise<Record<string, SharedChat>> {
  const readable = await readableShares(ids, session);
  return Object.fromEntries(readable.map(({ doc, share }) => [ share.id, sharedChat(doc, share, PREVIEW_TURNS, PREVIEW_LENGTH) ]));
}

export async function getSharedChat(shareId: string, session: SessionInfo): Promise<SharedChat | undefined> {
  const [ readable ] = await readableShares([ shareId ], session);
  return readable && sharedChat(readable.doc, readable.share);
}
