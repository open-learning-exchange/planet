/* eslint-disable no-console */
import OpenAI, { toFile } from 'openai';

import { resourceDB } from '../../../config/couch.config';
import { Attachment, ResourceVectorStore, ResourceVectorStoreFile } from '../models/db-doc.model';
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
  _attachments?: Record<string, Attachment>;
  aiVectorStore?: ResourceVectorStore;
}

export interface ResourceIndex {
  vectorStoreId: string;
  indexedFiles: string[];
}

const eligibleAttachments = (doc: ResourceDoc): Array<[string, Attachment]> =>
  Object.entries(doc._attachments || {}).filter(([ , attachment ]) => SUPPORTED_CONTENT_TYPES.has(attachment.content_type));

const isUpToDate = (existing: ResourceVectorStore, eligible: Array<[string, Attachment]>): boolean =>
  Object.keys(existing.files).length === eligible.length &&
  eligible.every(([ name, attachment ]) => existing.files[name]?.digest === attachment.digest);

/**
 * Ensures a resource's supported attachments are uploaded to OpenAI and
 * collected in a vector store for file_search. Indexing is lazy (first chat
 * that references the resource pays the cost) and incremental: attachments are
 * re-uploaded only when their CouchDB digest changes, and stale OpenAI files
 * are cleaned up. State is persisted on the resource doc as `aiVectorStore`.
 *
 * Returns null when the resource has no supported attachments.
 */
export async function ensureResourceIndexed(client: OpenAI, resourceId: string): Promise<ResourceIndex | null> {
  const doc = await resourceDB.get(resourceId) as unknown as ResourceDoc;
  const eligible = eligibleAttachments(doc);
  if (eligible.length === 0) {
    return null;
  }

  const existing = doc.aiVectorStore;
  if (existing && isUpToDate(existing, eligible)) {
    return { 'vectorStoreId': existing.id, 'indexedFiles': Object.keys(existing.files) };
  }

  let vectorStoreId = existing?.id;
  if (vectorStoreId) {
    try {
      await client.vectorStores.retrieve(vectorStoreId);
    } catch (error) {
      vectorStoreId = undefined;
    }
  }
  if (!vectorStoreId) {
    const store = await client.vectorStores.create({ 'name': `planet-resource-${resourceId}` });
    vectorStoreId = store.id;
  }

  const files: Record<string, ResourceVectorStoreFile> = {};
  const newFileIds: string[] = [];
  for (const [ name, attachment ] of eligible) {
    const prior = existing?.files[name];
    if (prior && prior.digest === attachment.digest) {
      files[name] = prior;
      continue;
    }
    const buffer = await resourceDB.attachment.get(resourceId, name);
    const uploaded = await client.files.create({ 'file': await toFile(buffer, name), 'purpose': 'assistants' });
    files[name] = { 'fileId': uploaded.id, 'digest': attachment.digest };
    newFileIds.push(uploaded.id);
  }
  if (newFileIds.length) {
    const batch = await client.vectorStores.fileBatches.createAndPoll(vectorStoreId, { 'file_ids': newFileIds });
    if (batch.status !== 'completed' || batch.file_counts.failed > 0) {
      console.error(
        `chatapi: vector store batch for resource ${resourceId} finished as ${batch.status} (${batch.file_counts.failed} failed)`
      );
    }
  }

  // Remove OpenAI files that no longer correspond to a current attachment
  for (const [ name, file ] of Object.entries(existing?.files || {})) {
    if (files[name]?.fileId === file.fileId) {
      continue;
    }
    await client.vectorStores.files.del(vectorStoreId, file.fileId).catch(() => undefined);
    await client.files.del(file.fileId).catch(() => undefined);
  }

  const aiVectorStore: ResourceVectorStore = { 'id': vectorStoreId, files, 'updatedDate': Date.now() };
  try {
    await resourceDB.insert({ ...doc, aiVectorStore } as any);
  } catch (error: any) {
    if (error?.statusCode !== 409) {
      throw error;
    }
    // A concurrent chat turn indexed this resource first. Keep the winner's
    // state, discard our duplicate uploads, and retry the write otherwise.
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
    await resourceDB.insert({ ...latest, aiVectorStore } as any);
  }

  return { vectorStoreId, 'indexedFiles': Object.keys(files) };
}

/**
 * Deletes the vector store and uploaded files for a resource. Call this
 * before deleting the resource doc, otherwise the OpenAI-side objects leak.
 */
export async function deleteResourceIndex(client: OpenAI, resourceId: string): Promise<boolean> {
  let doc: ResourceDoc | null = null;
  try {
    doc = await resourceDB.get(resourceId) as unknown as ResourceDoc;
  } catch (error) {
    throw new HttpError(404, 'Resource not found');
  }
  const store = doc.aiVectorStore;
  if (!store) {
    return false;
  }
  for (const file of Object.values(store.files)) {
    await client.files.del(file.fileId).catch(() => undefined);
  }
  await client.vectorStores.del(store.id).catch(() => undefined);
  const { aiVectorStore, ...rest } = doc;
  void aiVectorStore;
  await resourceDB.insert(rest as any);
  return true;
}
