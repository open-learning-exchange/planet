import { TimedSyncSkipReason, TimedSyncStatus } from '../models/sync.model';
import { isScheduleEnabled, isSyncDue, nextRunAt, resolveIntervalHours } from '../utils/sync-schedule.utils';
import { isRunningReplicator } from '../utils/replicator.utils';
import {
  getPlanetConfiguration,
  getSyncReplicators,
  getSyncSchedule,
  logTimedSync,
  readTimedSyncState,
  restartSyncReplicators,
  writeTimedSyncState
} from './timed-sync.service';

const TICK_INTERVAL_MS = 60000;

const idleStatus: TimedSyncStatus = {
  'enabled': false,
  'preset': null,
  'intervalHours': null,
  'lastRunAt': null,
  'nextRunAt': null,
  'lastResult': null,
  'lastError': null,
  'replicatorCount': null,
  'skipReason': null
};

let status: TimedSyncStatus = { ...idleStatus };
let ticker: NodeJS.Timeout | null = null;
let stateLoaded = false;
let running = false;

const log = (message: string) => console.info(`[timed-sync] ${message}`); // eslint-disable-line no-console

export function getTimedSyncStatus(): TimedSyncStatus {
  return status;
}

async function loadState() {
  if (stateLoaded) {
    return;
  }
  const state = await readTimedSyncState();
  status = {
    ...status,
    'lastRunAt': state?.lastRunAt ?? null,
    'lastResult': state?.lastResult ?? null,
    'lastError': state?.lastError ?? null,
    'replicatorCount': state?.replicatorCount ?? null
  };
  stateLoaded = true;
}

function skip(reason: TimedSyncSkipReason, schedule: any) {
  status = {
    ...status,
    'enabled': isScheduleEnabled(schedule),
    'preset': schedule?.preset ?? null,
    'intervalHours': schedule ? resolveIntervalHours(schedule) : null,
    'nextRunAt': null,
    'skipReason': reason
  };
}

async function runTimedSync(configuration: any, schedule: any, replicators: any[]) {
  const runAt = Date.now();
  try {
    const { replicatorCount, owner } = await restartSyncReplicators(replicators);
    await logTimedSync(configuration, replicatorCount, owner);
    status = { ...status, 'lastRunAt': runAt, 'lastResult': 'success', 'lastError': null, replicatorCount };
    log(`restarted ${replicatorCount} replicators`);
  } catch (error: any) {
    status = {
      ...status,
      'lastRunAt': runAt,
      'lastResult': 'error',
      'lastError': error?.message ?? 'Unknown error',
      'replicatorCount': null
    };
    log(`failed: ${status.lastError}`);
  }
  await writeTimedSyncState({
    'lastRunAt': status.lastRunAt,
    'lastResult': status.lastResult,
    'lastError': status.lastError,
    'replicatorCount': status.replicatorCount
  });
}

/**
 * Reads the schedule off the configuration doc on every tick so a manager
 * changing it in the app takes effect without restarting the gateway.
 */
async function tick(runIfDue: boolean) {
  if (running) {
    return;
  }
  running = true;
  try {
    await loadState();
    const configuration = await getPlanetConfiguration();
    const schedule = getSyncSchedule(configuration);
    if (!configuration) {
      skip('noConfiguration', schedule);
      return;
    }
    if (configuration.alwaysOnline === true) {
      // Continuous replicators are already running; a timed re-run adds nothing.
      skip('alwaysOnline', schedule);
      return;
    }
    if (!isScheduleEnabled(schedule)) {
      skip('disabled', schedule);
      return;
    }
    status = {
      ...status,
      'enabled': true,
      'preset': schedule?.preset ?? null,
      'intervalHours': resolveIntervalHours(schedule),
      'nextRunAt': nextRunAt(status.lastRunAt, schedule),
      'skipReason': null
    };
    if (!runIfDue || !isSyncDue(status.lastRunAt, schedule)) {
      return;
    }
    const replicators = await getSyncReplicators();
    if (replicators.length === 0) {
      // Nothing to re-run until a manager has synced once and left credentials behind.
      skip('noReplicators', schedule);
      return;
    }
    if (replicators.some(isRunningReplicator)) {
      // Restarting a replication that is still going would keep it from ever finishing.
      skip('syncInProgress', schedule);
      return;
    }
    await runTimedSync(configuration, schedule, replicators);
    status = { ...status, 'nextRunAt': nextRunAt(status.lastRunAt, schedule) };
  } catch (error: any) {
    log(`could not read schedule: ${error?.message ?? error}`);
  } finally {
    running = false;
  }
}

export function startTimedSyncScheduler() {
  if (ticker) {
    return;
  }
  void tick(false);
  ticker = setInterval(() => void tick(true), TICK_INTERVAL_MS);
}
