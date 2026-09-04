import { adminActivitiesDB, configurationDB, replicatorDB } from '../../../config/couch.config';
import { SyncSchedule, TimedSyncState } from '../models/sync.model';
import { isSyncReplicator, toDeletedReplicator, toRestartedReplicator } from '../utils/replicator.utils';

const STATE_DOC_ID = 'timed_sync_state';
const STATE_DOC_TYPE = 'timedSyncState';

const isDesignDoc = (id: string) => id.startsWith('_design/');

/**
 * The local planet holds a single configuration doc, the same one the app reads
 * through its state service.
 */
export async function getPlanetConfiguration() {
  const res = await configurationDB.list({ 'include_docs': true });
  const row = res.rows.find((doc) => !isDesignDoc(doc.id));
  return (row?.doc as any) ?? null;
}

export function getSyncSchedule(configuration: any): SyncSchedule | null {
  return (configuration?.syncSchedule as SyncSchedule) ?? null;
}

export async function readTimedSyncState(): Promise<any> {
  try {
    return await adminActivitiesDB.get(STATE_DOC_ID);
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function writeTimedSyncState(state: TimedSyncState) {
  const existing = await readTimedSyncState();
  await adminActivitiesDB.insert({
    ...existing,
    ...state,
    '_id': STATE_DOC_ID,
    'type': STATE_DOC_TYPE
  });
}

export async function getSyncReplicators() {
  const res = await replicatorDB.list({ 'include_docs': true });
  return res.rows
    .map((row) => row.doc as any)
    .filter((doc) => isSyncReplicator(doc));
}

/**
 * Re-runs the replicators the last manual sync left behind. Deleting the
 * completed docs and inserting them again is what the manager app does on every
 * "Run Sync", so a timed sync stays the same operation minus the password
 * prompt.
 */
export async function restartSyncReplicators(replicators: any[]) {
  await replicatorDB.bulk({ 'docs': replicators.map(toDeletedReplicator) });
  const results = await replicatorDB.bulk({ 'docs': replicators.map(toRestartedReplicator) });
  const failed = results.filter((result: any) => result.error);
  if (failed.length > 0) {
    const reason = failed[0].reason ?? failed[0].error;
    throw new Error(`Could not restart ${failed.length} of ${replicators.length} replicators: ${reason}`);
  }
  return { 'replicatorCount': replicators.length, 'owner': (replicators[0].owner as string) ?? null };
}

/**
 * Logged with the same `sync` type a manual sync writes, so nation reports keep
 * reporting a community's last sync whether a human or the schedule ran it.
 */
export async function logTimedSync(configuration: any, replicatorCount: number, owner: string | null) {
  await adminActivitiesDB.insert({
    'type': 'sync',
    'automated': true,
    'createdOn': configuration?.code,
    'parentCode': configuration?.parentCode,
    'user': owner,
    replicatorCount,
    'time': Date.now()
  });
}
