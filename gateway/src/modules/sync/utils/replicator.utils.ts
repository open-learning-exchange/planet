// Manual syncs name their replicators `<db>_push` / `<db>_pull`, while item
// fetches append a timestamp and internal replicators are already continuous.
const SYNC_REPLICATOR_ID = /_(push|pull)$/;

// Written by CouchDB onto the replicator doc, and rejected on a new one.
const REPLICATION_FIELDS = [
  '_rev',
  '_replication_id',
  '_replication_state',
  '_replication_state_time',
  '_replication_state_reason',
  '_replication_stats'
];

// CouchDB only stops writing to a replicator doc once it reaches one of these.
const FINISHED_STATES = [ 'completed', 'error', 'failed' ];

export function isSyncReplicator(doc: any) {
  return typeof doc?._id === 'string' &&
    !doc._id.startsWith('_design/') &&
    SYNC_REPLICATOR_ID.test(doc._id) &&
    doc.continuous !== true;
}

export function isRunningReplicator(doc: any) {
  return !FINISHED_STATES.includes(doc?._replication_state);
}

/**
 * A completed replicator doc still holds the credentials the manager entered
 * for its last run, so a timed sync re-runs the same doc instead of asking for
 * a password nobody is at the keyboard to type.
 */
export function toRestartedReplicator(doc: any) {
  const replicator: any = { ...doc };
  REPLICATION_FIELDS.forEach((field) => delete replicator[field]);
  replicator.continuous = false;
  return replicator;
}

export function toDeletedReplicator(doc: any) {
  return { '_id': doc._id, '_rev': doc._rev, '_deleted': true };
}
