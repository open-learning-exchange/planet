import { SyncSchedule } from '../models/sync.model';

export const MIN_INTERVAL_HOURS = 1;
export const MAX_INTERVAL_HOURS = 168;
export const DEFAULT_INTERVAL_HOURS = 24;

const HOUR_IN_MS = 3600000;

/**
 * The manager app writes an already resolved `intervalHours`, so anything
 * missing or out of range here is a doc edited elsewhere. Fall back to daily
 * rather than syncing on a nonsense interval.
 */
export function resolveIntervalHours(schedule?: SyncSchedule | null) {
  const hours = Math.round(Number(schedule?.intervalHours));
  if (!Number.isFinite(hours) || hours < MIN_INTERVAL_HOURS) {
    return DEFAULT_INTERVAL_HOURS;
  }
  return Math.min(hours, MAX_INTERVAL_HOURS);
}

export function resolveIntervalMs(schedule?: SyncSchedule | null) {
  return resolveIntervalHours(schedule) * HOUR_IN_MS;
}

export function isScheduleEnabled(schedule?: SyncSchedule | null) {
  return schedule?.enabled === true;
}

export function isSyncDue(lastRunAt: number | null, schedule?: SyncSchedule | null, now = Date.now()) {
  if (!lastRunAt) {
    return true;
  }
  return now - lastRunAt >= resolveIntervalMs(schedule);
}

export function nextRunAt(lastRunAt: number | null, schedule?: SyncSchedule | null) {
  return lastRunAt ? lastRunAt + resolveIntervalMs(schedule) : null;
}
