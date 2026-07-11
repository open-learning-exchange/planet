/* eslint-disable no-console */
import OpenAI, { toFile } from 'openai';

import { resourceDB } from '../../../config/couch.config';
import { Attachment, ResourceVectorStore, ResourceVectorStoreFile } from '../models/db-doc.model';
import { canManageResources, SessionInfo } from '../middleware/auth';
import { getAIConfig } from './config.service';
import { HttpError } from '../utils/http-error';

/** Attachment content types OpenAI file_search can ingest. */
const SUPPORTED_CONTENT_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/html',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

interface ResourceDoc {
  _id: string;
  _rev: string;
  title?: string;
  addedBy?: string;
  sourcePlanet?: string;
  private?: boolean;
  privateFor?: { users?: string };
  _attachments?: Record<string, Attachment>;
  aiVectorStore?: ResourceVectorStore;
}

export interface ResourceIndex {
  vectorStoreId: string;
  indexedFiles: string[];
}

const isNotFound = (error: any): boolean => error?.status === 404 || error?.statusCode === 404;

const eligibleAttachments = (doc: ResourceDoc): Array<[string, Attachment]> =>
  Object.entries(doc._attachments || {}).filter(([ , attachment ]) => SUPPORTED_CONTENT_TYPES.has(attachment.content_type));

const isUpToDate = (existing: ResourceVectorStore, eligible: Array<[string, Attachment]>): boolean =>
  Object.keys(existing.files).length === eligible.length &&
  eligible.every(([ name, attachment ]) => existing.files[name]?.digest === attachment.digest);

/**
 * Deletes the OpenAI-side objects and strips `aiVectorStore` from the doc;
 * returns the new rev. Only "already gone" (404) deletions are ignored — a
 * transient OpenAI failure must not strip the IDs and orphan the content, so
 * it surfaces as a retryable 502 with the doc state intact.
 */
const removeIndexState = async (client: OpenAI, doc: ResourceDoc): Promise<string | undefined> => {
  const store = doc.aiVectorStore;
  if (!store) {
    return undefined;
  }
  let failed = false;
  const attempt = (operation: Promise<unknown>) => operation.catch((error) => {
    if (!isNotFound(error)) {
      failed = true;
    }
  });
  for (const file of Object.values(store.files)) {
    await attempt(client.files.del(file.fileId));
  }
  await attempt(client.vectorStores.del(store.id));
  if (failed) {
    throw new HttpError(502, 'Could not delete the OpenAI-side index; try again later');
  }
  const { aiVectorStore, ...rest } = doc;
  void aiVectorStore;
  const response = await resourceDB.insert(rest as any);
  return response.rev;
};

/**
 * Ensures a resource's supported attachments are uploaded to OpenAI and
 * collected in a vector store for file_search. Indexing is lazy (first chat
 * that references the resource pays the cost) and incremental: attachments are
 * re-uploaded only when their CouchDB digest changes, and stale OpenAI files
 * are cleaned up. State is persisted on the resource doc as `aiVectorStore`.
 *
 * Returns null when the resource has no supported attachments.
 *
 * When `forUser` is given, personal (`private`) resources are only indexed for
 * their owner — the gateway reads attachments with service credentials, so this
 * guards the one visibility rule the resources database has.
 */
export async function ensureResourceIndexed(
  client: OpenAI, resourceId: string, forUser?: string, retried = false
): Promise<ResourceIndex | null> {
  const doc = await resourceDB.get(resourceId) as unknown as ResourceDoc;
  if (forUser && doc.private && doc.privateFor?.users !== `org.couchdb.user:${forUser}`) {
    throw new HttpError(403, 'This resource is private');
  }
  const eligible = eligibleAttachments(doc);
  if (eligible.length === 0) {
    // Attachments may have been removed after indexing; don't leave an orphaned store behind
    await removeIndexState(client, doc);
    return null;
  }

  // Trust-but-verify: the saved state may point at a store deleted or expired on
  // OpenAI's side, making the prior file state unusable. Only a definitive 404 or
  // a non-ready status invalidates it — a transient error must not trigger a
  // destructive rebuild, so it propagates (chat degrades gracefully).
  let existing = doc.aiVectorStore;
  if (existing) {
    try {
      const store = await client.vectorStores.retrieve(existing.id);
      if (store.status !== 'completed') {
        existing = undefined;
      }
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      existing = undefined;
    }
  }
  if (existing && isUpToDate(existing, eligible)) {
    return { 'vectorStoreId': existing.id, 'indexedFiles': Object.keys(existing.files) };
  }

  let vectorStoreId = existing?.id;
  const freshStore = !vectorStoreId;
  if (!vectorStoreId) {
    const store = await client.vectorStores.create({ 'name': `planet-resource-${resourceId}` });
    vectorStoreId = store.id;
  }

  const files: Record<string, ResourceVectorStoreFile> = {};
  const newFileIds: string[] = [];
  // Any failure below cleans up what this attempt created on OpenAI's side —
  // persisting or abandoning a partial index would leak files and block retries
  const rollbackAttempt = async () => {
    for (const fileId of newFileIds) {
      await client.vectorStores.files.del(vectorStoreId, fileId).catch(() => undefined);
      await client.files.del(fileId).catch(() => undefined);
    }
    if (freshStore) {
      await client.vectorStores.del(vectorStoreId).catch(() => undefined);
    }
  };

  try {
    for (const [ name, attachment ] of eligible) {
      const prior = existing?.files[name];
      if (prior && prior.digest === attachment.digest) {
        files[name] = prior;
        continue;
      }
      const buffer = await resourceDB.attachment.get(resourceId, name);
      const uploaded = await client.files.create({ 'file': await toFile(buffer, name), 'purpose': 'user_data' });
      files[name] = { 'fileId': uploaded.id, 'digest': attachment.digest };
      newFileIds.push(uploaded.id);
    }
    if (newFileIds.length) {
      const batch = await client.vectorStores.fileBatches.createAndPoll(vectorStoreId, { 'file_ids': newFileIds });
      if (batch.status !== 'completed' || batch.file_counts.failed > 0) {
        throw new HttpError(
          502, `Vector store batch for resource ${resourceId} finished as ${batch.status} (${batch.file_counts.failed} failed)`
        );
      }
    }

    // Remove OpenAI files that no longer correspond to a current attachment
    // (checked against the saved doc state, so files from a vanished store go too)
    for (const [ name, file ] of Object.entries(doc.aiVectorStore?.files || {})) {
      if (files[name]?.fileId === file.fileId) {
        continue;
      }
      await client.vectorStores.files.del(vectorStoreId, file.fileId).catch(() => undefined);
      await client.files.del(file.fileId).catch(() => undefined);
    }

    const aiVectorStore: ResourceVectorStore = { 'id': vectorStoreId, files, 'updatedDate': Date.now() };
    await resourceDB.insert({ ...doc, aiVectorStore } as any);
    return { vectorStoreId, 'indexedFiles': Object.keys(files) };
  } catch (error: any) {
    if (error?.statusCode === 409) {
      // A concurrent write won. Adopt its index when it matches the current
      // attachments; otherwise scrap this attempt and rebuild against the new doc
      // (persisting our state onto `latest` could index a superseded revision).
      const latest = await resourceDB.get(resourceId) as unknown as ResourceDoc;
      const winner = latest.aiVectorStore;
      if (winner && isUpToDate(winner, eligibleAttachments(latest))) {
        const winnerFileIds = new Set(Object.values(winner.files).map((file) => file.fileId));
        for (const fileId of newFileIds.filter((id) => !winnerFileIds.has(id))) {
          await client.vectorStores.files.del(vectorStoreId, fileId).catch(() => undefined);
          await client.files.del(fileId).catch(() => undefined);
        }
        if (winner.id !== vectorStoreId) {
          await client.vectorStores.del(vectorStoreId).catch(() => undefined);
        }
        return { 'vectorStoreId': winner.id, 'indexedFiles': Object.keys(winner.files) };
      }
      await rollbackAttempt();
      if (!retried) {
        return ensureResourceIndexed(client, resourceId, forUser, true);
      }
      throw new HttpError(409, `Resource ${resourceId} kept changing while indexing; try again`);
    }
    await rollbackAttempt();
    throw error;
  }
}

/**
 * Deletes the vector store and uploaded files for a resource. Call this
 * before deleting the resource doc, otherwise the OpenAI-side objects leak.
 * Stripping `aiVectorStore` bumps the doc's `_rev`; the new rev is returned so
 * callers about to delete the doc don't fail with a stale-rev conflict.
 *
 * When `requester` is given, only managers/admins or the resource's local
 * owner may remove the index — mirroring the client's manage rule (`addedBy`
 * match plus the resource originating from this planet).
 */
export async function deleteResourceIndex(
  client: OpenAI, resourceId: string, requester?: SessionInfo
): Promise<{ removed: boolean; rev?: string }> {
  let doc: ResourceDoc | null = null;
  try {
    doc = await resourceDB.get(resourceId) as unknown as ResourceDoc;
  } catch (error) {
    throw new HttpError(404, 'Resource not found');
  }
  if (requester && !canManageResources(requester.roles)) {
    const { planetCode } = await getAIConfig();
    const ownsLocally = doc.addedBy === requester.name && (!planetCode || doc.sourcePlanet === planetCode);
    if (!ownsLocally) {
      throw new HttpError(403, 'Only managers or the resource owner can remove its index');
    }
  }
  const rev = await removeIndexState(client, doc);
  return rev ? { 'removed': true, rev } : { 'removed': false };
}
