/* eslint-disable no-console */
import { createHash } from 'crypto';
import { setTimeout as wait } from 'timers/promises';
import OpenAI, { toFile } from 'openai';

import { listResourceLocalDocs, requestResourceDatabase, RESOURCE_INDEX_STATE_PREFIX } from '../../../config/couch.config';
import { SessionInfo } from '../middleware/auth';
import { Attachment, ResourceVectorStore } from '../models/db-doc.model';
import { HttpError } from '../utils/http-error';
import { getResourceIndexTimeoutMs } from '../utils/timeout.utils';
import { getAIConfig } from './config.service';

export const FILE_SEARCH_CONTENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/html',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
] as const;
const SUPPORTED_CONTENT_TYPES = new Set<string>(FILE_SEARCH_CONTENT_TYPES);
const DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_RESOURCE_INDEX_FILES = 500;
const FILE_BATCH_POLL_INTERVAL_MS = 5000;
const REMOTE_MAINTENANCE_TIMEOUT_MS = 5000;
const RESOURCE_INDEX_ADMIN_ROLES = new Set([ '_admin', 'manager' ]);
const RECONCILIATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const resourceOperationTails = new Map<string, Promise<void>>();
let reconciliationTimer: NodeJS.Timeout | undefined;
let reconciliationInFlight: Promise<void> | undefined;

interface ResourceDoc {
  addedBy?: string;
  sourcePlanet?: string;
  private?: boolean;
  privateFor?: { users?: string };
  _attachments?: Record<string, Attachment>;
}

interface ResourceIndexState {
  _id: string;
  _rev: string;
  resourceId: string;
  store: ResourceVectorStore;
}

export interface ResourceIndex {
  vectorStoreId: string;
  fileNamesById: Record<string, string>;
}

const isNotFound = (error: any): boolean => error?.status === 404 || error?.statusCode === 404;
const canManageAnyResourceIndex = (roles: string[]): boolean =>
  roles.some((role) => RESOURCE_INDEX_ADMIN_ROLES.has(role));
const positiveIntegerOr = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const maxFileBytes = (): number => positiveIntegerOr(process.env.RESOURCE_INDEX_MAX_FILE_BYTES, DEFAULT_MAX_FILE_BYTES);
const maxTotalBytes = (): number => positiveIntegerOr(process.env.RESOURCE_INDEX_MAX_TOTAL_BYTES, DEFAULT_MAX_TOTAL_BYTES);
const indexStateId = (resourceId: string): string =>
  `${RESOURCE_INDEX_STATE_PREFIX}${createHash('sha256').update(resourceId).digest('hex')}`;
const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw signal.reason || new Error('Resource indexing cancelled');
  }
};

const waitForResourceLock = async (predecessor: Promise<void>, signal?: AbortSignal) => {
  if (!signal) {
    await predecessor.catch(() => undefined);
    return;
  }
  throwIfAborted(signal);
  let abortWait: () => void = () => undefined;
  const aborted = new Promise<never>((resolve, reject) => {
    void resolve;
    abortWait = () => reject(signal.reason || new Error('Resource operation cancelled'));
    signal.addEventListener('abort', abortWait, { 'once': true });
  });
  try {
    await Promise.race([ predecessor.catch(() => undefined), aborted ]);
  } finally {
    signal.removeEventListener('abort', abortWait);
  }
};

const withResourceLock = async <T>(resourceId: string, signal: AbortSignal | undefined, operation: () => Promise<T>): Promise<T> => {
  const predecessor = resourceOperationTails.get(resourceId) || Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = predecessor.catch(() => undefined).then(() => current);
  resourceOperationTails.set(resourceId, tail);
  try {
    await waitForResourceLock(predecessor, signal);
    throwIfAborted(signal);
    return await operation();
  } finally {
    release();
    void tail.finally(() => {
      if (resourceOperationTails.get(resourceId) === tail) {
        resourceOperationTails.delete(resourceId);
      }
    });
  }
};

const normalizedContentType = (contentType: string): string => contentType.split(';', 1)[0].trim().toLowerCase();

const isSupportedAttachment = (attachment: unknown): attachment is Attachment =>
  !!attachment && typeof attachment === 'object' &&
  typeof (attachment as Attachment).content_type === 'string' &&
  SUPPORTED_CONTENT_TYPES.has(normalizedContentType((attachment as Attachment).content_type));

const hasSupportedResourceAttachments = (attachments?: Record<string, unknown>): boolean =>
  Object.values(attachments || {}).some(isSupportedAttachment);

const eligibleAttachments = (doc: ResourceDoc): Array<[string, Attachment]> =>
  Object.entries(doc._attachments || {}).filter(([ , attachment ]) => isSupportedAttachment(attachment));

const loadResource = async (resourceId: string, forUser?: string, signal?: AbortSignal): Promise<ResourceDoc> => {
  throwIfAborted(signal);
  const doc = await requestResourceDatabase({ 'doc': resourceId, signal }) as ResourceDoc;
  throwIfAborted(signal);
  if (forUser && doc.private && doc.privateFor?.users !== `org.couchdb.user:${forUser}`) {
    throw new HttpError(403, 'This resource is private');
  }
  return doc;
};

/** Inspect authoritative CouchDB metadata instead of trusting attachment fields supplied by a client. */
export async function resourceHasSupportedAttachments(
  resourceId: string,
  forUser?: string,
  signal?: AbortSignal
): Promise<boolean> {
  const doc = await loadResource(resourceId, forUser, signal);
  return hasSupportedResourceAttachments(doc._attachments);
}

const enforceAttachmentLimits = (eligible: Array<[string, Attachment]>) => {
  const fileLimit = maxFileBytes();
  const totalLimit = maxTotalBytes();
  if (eligible.length > MAX_RESOURCE_INDEX_FILES) {
    throw new HttpError(413, `A resource can have at most ${MAX_RESOURCE_INDEX_FILES} attachments indexed for AI search`);
  }
  const missingSize = eligible.find(([ , attachment ]) =>
    typeof attachment.length !== 'number' || !Number.isInteger(attachment.length) || attachment.length < 0);
  if (missingSize) {
    throw new HttpError(413, `Could not verify the size of attachment "${missingSize[0]}" for AI indexing`);
  }
  const knownTotal = eligible.reduce((total, [ , attachment ]) => total + (attachment.length || 0), 0);
  const oversized = eligible.find(([ , attachment ]) => (attachment.length || 0) > fileLimit);
  if (oversized) {
    throw new HttpError(413, `Attachment "${oversized[0]}" exceeds the ${fileLimit}-byte AI indexing limit`);
  }
  if (knownTotal > totalLimit) {
    throw new HttpError(413, `Resource attachments exceed the ${totalLimit}-byte total AI indexing limit`);
  }
};

const isUpToDate = (existing: ResourceVectorStore, eligible: Array<[string, Attachment]>): boolean =>
  !existing.dirty && Object.keys(existing.files).length === eligible.length &&
  eligible.every(([ name, attachment ]) => existing.files[name]?.digest === attachment.digest);

const asResourceIndex = (store: ResourceVectorStore): ResourceIndex => ({
  'vectorStoreId': store.id,
  'fileNamesById': Object.entries(store.files).reduce((names, [ name, file ]) => ({ ...names, [file.fileId]: name }), {})
});

const loadIndexState = async (resourceId: string, signal?: AbortSignal): Promise<ResourceIndexState | undefined> => {
  try {
    return await requestResourceDatabase({ 'doc': indexStateId(resourceId), signal }) as ResourceIndexState;
  } catch (error: any) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
};

const saveIndexState = async (resourceId: string, store: ResourceVectorStore, signal?: AbortSignal) => {
  const localId = indexStateId(resourceId);
  return requestResourceDatabase({
    'method': 'PUT',
    'doc': localId,
    'body': { '_id': localId, resourceId, store },
    signal
  });
};

const markIndexStateDirty = async (state: ResourceIndexState, signal?: AbortSignal): Promise<ResourceIndexState> => {
  if (state.store.dirty) {
    return state;
  }
  const dirtyState = { ...state, 'store': { ...state.store, 'dirty': true } };
  const response = await requestResourceDatabase({
    'method': 'PUT', 'doc': state._id, 'body': dirtyState, signal
  });
  return { ...dirtyState, '_rev': response.rev };
};

const ignoreNotFound = async (operation: Promise<unknown>) => {
  try {
    await operation;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
};

const deleteRemoteIndex = async (client: OpenAI, store: ResourceVectorStore, signal?: AbortSignal) => {
  await ignoreNotFound(signal ? client.vectorStores.del(store.id, { signal }) : client.vectorStores.del(store.id));
  for (const { fileId } of Object.values(store.files)) {
    await ignoreNotFound(signal ? client.files.del(fileId, { signal }) : client.files.del(fileId));
  }
};

const remoteCleanupErrorContext = (error: any): string => {
  const status = error?.status || error?.statusCode;
  const requestId = error?.request_id || error?.headers?.['x-request-id'];
  return `${status ? ` (status ${status})` : ''}${requestId ? `, request ${requestId}` : ''}`;
};

/** The pinned SDK helper omits request options during create and cannot cancel its polling sleep. */
const createFileBatchAndWait = async (client: OpenAI, storeId: string, fileIds: string[], signal: AbortSignal) => {
  let batch = await client.vectorStores.fileBatches.create(storeId, { 'file_ids': fileIds }, { signal });
  while (batch.status === 'in_progress') {
    await wait(FILE_BATCH_POLL_INTERVAL_MS, undefined, { signal });
    batch = await client.vectorStores.fileBatches.retrieve(storeId, batch.id, { signal });
  }
  return batch;
};

const removeIndexState = async (client: OpenAI, state?: ResourceIndexState, signal?: AbortSignal): Promise<boolean> => {
  if (!state) {
    return false;
  }
  throwIfAborted(signal);
  const dirtyState = await markIndexStateDirty(state, signal);
  try {
    await deleteRemoteIndex(client, dirtyState.store, signal);
  } catch (error: any) {
    throwIfAborted(signal);
    console.error(`chatapi: OpenAI index cleanup failed${remoteCleanupErrorContext(error)}`);
    throw new HttpError(502, 'Could not delete the OpenAI-side index; try again later');
  }
  await requestResourceDatabase({
    'method': 'DELETE', 'doc': dirtyState._id, 'qs': { 'rev': dirtyState._rev }, signal
  });
  return true;
};

/** Rebuild an index when the resource's attachment digests change. */
async function ensureResourceIndexedUnlocked(
  client: OpenAI,
  resourceId: string,
  signal: AbortSignal,
  forUser?: string
): Promise<ResourceIndex | null> {
  const doc = await loadResource(resourceId, forUser, signal);
  const eligible = eligibleAttachments(doc);
  const state = await loadIndexState(resourceId, signal);
  if (eligible.length === 0) {
    await removeIndexState(client, state, signal);
    return null;
  }
  enforceAttachmentLimits(eligible);

  if (state && !state.store.dirty && isUpToDate(state.store, eligible)) {
    return asResourceIndex(state.store);
  }
  if (state) {
    await removeIndexState(client, state, signal);
  }

  throwIfAborted(signal);
  const created = await client.vectorStores.create({ 'name': `planet-resource-${resourceId}` }, { signal });
  const store: ResourceVectorStore = { 'id': created.id, 'files': {} };

  try {
    for (const [ name, attachment ] of eligible) {
      throwIfAborted(signal);
      const buffer = await requestResourceDatabase({
        'doc': resourceId, 'att': name, 'dontParse': true, signal
      }) as Buffer;
      if (buffer.length > maxFileBytes()) {
        throw new HttpError(413, `Attachment "${name}" exceeds the ${maxFileBytes()}-byte AI indexing limit`);
      }
      const uploaded = await client.files.create(
        { 'file': await toFile(buffer, name), 'purpose': 'user_data' },
        { signal }
      );
      store.files[name] = { 'fileId': uploaded.id, 'digest': attachment.digest };
    }
    const batch = await createFileBatchAndWait(
      client,
      store.id,
      Object.values(store.files).map((file) => file.fileId),
      signal
    );
    if (batch.status !== 'completed' || batch.file_counts.failed > 0) {
      throw new HttpError(
        502,
        `Vector store batch for resource ${resourceId} finished as ${batch.status} (${batch.file_counts.failed} failed)`
      );
    }

    throwIfAborted(signal);
    await saveIndexState(resourceId, store, signal);
    return asResourceIndex(store);
  } catch (error: any) {
    const cleanupSignal = AbortSignal.timeout(REMOTE_MAINTENANCE_TIMEOUT_MS);
    await deleteRemoteIndex(client, store, cleanupSignal).catch(async (cleanupError) => {
      console.error(`chatapi: failed index build cleanup for resource ${resourceId}${remoteCleanupErrorContext(cleanupError)}`);
      try {
        const stateSignal = AbortSignal.timeout(REMOTE_MAINTENANCE_TIMEOUT_MS);
        await saveIndexState(resourceId, { ...store, 'dirty': true }, stateSignal);
      } catch {
        console.error(`chatapi: failed to retain index build cleanup state for resource ${resourceId}`);
      }
    });
    throw error;
  }
}

/** Obtain an OpenAI client for index maintenance without requiring a chat model. */
export async function getOpenAIIndexClient(): Promise<OpenAI> {
  const config = await getAIConfig();
  const { client } = config.providers.openai;
  if (!client) {
    throw new HttpError(503, 'AI provider "openai" has no API key configured');
  }
  return client;
}

/** Serialize one resource's local and OpenAI-side lifecycle within the gateway process. */
export async function ensureResourceIndexed(
  client: OpenAI,
  resourceId: string,
  forUser?: string,
  signal?: AbortSignal
): Promise<ResourceIndex | null> {
  const timeoutSignal = AbortSignal.timeout(getResourceIndexTimeoutMs());
  const indexSignal = signal ? AbortSignal.any([ signal, timeoutSignal ]) : timeoutSignal;
  try {
    return await withResourceLock(
      resourceId,
      indexSignal,
      () => ensureResourceIndexedUnlocked(client, resourceId, indexSignal, forUser)
    );
  } catch (error) {
    if (timeoutSignal.aborted && !signal?.aborted) {
      throw new HttpError(504, 'Resource indexing timed out');
    }
    throw error;
  }
}

/** Mark a saved index dirty when a failed file-search turn reveals that its remote store is unavailable. */
export function markResourceIndexDirtyIfUnavailable(
  client: OpenAI,
  resourceId: string,
  vectorStoreId: string
): Promise<void> {
  const recoverySignal = AbortSignal.timeout(REMOTE_MAINTENANCE_TIMEOUT_MS);
  const check = withResourceLock(resourceId, recoverySignal, async () => {
    const state = await loadIndexState(resourceId, recoverySignal);
    if (!state || state.store.id !== vectorStoreId || state.store.dirty) {
      return;
    }

    try {
      const store = await client.vectorStores.retrieve(vectorStoreId, { 'signal': recoverySignal });
      if (store.status !== 'expired') {
        return;
      }
    } catch (error) {
      if (!isNotFound(error)) {
        return;
      }
    }
    await markIndexStateDirty(state, recoverySignal);
  });
  return check.catch((error) => {
    if (!recoverySignal.aborted) {
      console.error(`chatapi: resource index recovery check failed for ${resourceId}${remoteCleanupErrorContext(error)}`);
    }
  });
}

/** Remove a deployment-local resource index and its OpenAI-side files. */
export async function deleteResourceIndex(
  getClient: () => Promise<OpenAI>,
  resourceId: string,
  requester?: SessionInfo,
  signal?: AbortSignal
): Promise<{ removed: boolean }> {
  return withResourceLock(resourceId, signal, async () => {
    const state = await loadIndexState(resourceId, signal);
    if (!state) {
      return { 'removed': false };
    }
    let doc: ResourceDoc | undefined;
    try {
      doc = await requestResourceDatabase({ 'doc': resourceId, signal }) as ResourceDoc;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
    if (requester && !canManageAnyResourceIndex(requester.roles)) {
      if (!doc) {
        throw new HttpError(403, 'Only managers can remove an index after its resource has been deleted');
      }
      const { planetCode } = await getAIConfig();
      const ownsLocally = !!planetCode && doc.addedBy === requester.name && doc.sourcePlanet === planetCode;
      if (!ownsLocally) {
        throw new HttpError(403, 'Only managers or the resource owner can remove its index');
      }
    }
    const client = await getClient();
    return { 'removed': await removeIndexState(client, state, signal) };
  });
}

/** Retry cleanup for deployment-local indexes whose resource document has disappeared. */
export async function reconcileOrphanedResourceIndexes(
  getClient: () => Promise<OpenAI> = getOpenAIIndexClient
): Promise<void> {
  const response = await listResourceLocalDocs() as {
    rows?: Array<{ doc?: ResourceIndexState }>;
  };
  const states = (response.rows || [])
    .map((row) => row.doc)
    .filter((state): state is ResourceIndexState =>
      !!state?._id?.startsWith(RESOURCE_INDEX_STATE_PREFIX) && typeof state.resourceId === 'string' && !!state.store?.id);
  let clientPromise: Promise<OpenAI> | undefined;
  for (const candidate of states) {
    try {
      await withResourceLock(candidate.resourceId, undefined, async () => {
        const state = await loadIndexState(candidate.resourceId);
        if (!state) {
          return;
        }
        if (!state.store.dirty) {
          try {
            await requestResourceDatabase({ 'doc': candidate.resourceId });
            return;
          } catch (error) {
            if (!isNotFound(error)) {
              throw error;
            }
          }
        }
        clientPromise ||= getClient();
        await removeIndexState(await clientPromise, state);
      });
    } catch (error) {
      console.error(`chatapi: deferred index cleanup failed for resource ${candidate.resourceId}: ${error}`);
    }
  }
}

/** Reconcile orphaned index state at startup and daily without keeping Node alive. */
export function startResourceIndexReconciliation(): () => void {
  const run = () => {
    if (reconciliationInFlight) {
      return;
    }
    reconciliationInFlight = getOpenAIIndexClient()
      .then((client) => reconcileOrphanedResourceIndexes(async () => client))
      .catch((error) => {
        if (!(error instanceof HttpError && error.statusCode === 503)) {
          console.error(`chatapi: resource index reconciliation failed: ${error}`);
        }
      })
      .finally(() => {
        reconciliationInFlight = undefined;
      });
  };
  run();
  if (!reconciliationTimer) {
    reconciliationTimer = setInterval(run, RECONCILIATION_INTERVAL_MS);
    reconciliationTimer.unref();
  }
  return () => {
    if (reconciliationTimer) {
      clearInterval(reconciliationTimer);
      reconciliationTimer = undefined;
    }
  };
}

/** Clear resource operation tails between isolated tests. */
export function resetResourceIndexLocks() {
  resourceOperationTails.clear();
}
