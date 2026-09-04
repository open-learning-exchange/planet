export type SyncSchedulePreset = 'hourly' | 'every3Hours' | 'every6Hours' | 'every12Hours' | 'daily' | 'custom';

/**
 * Timed sync settings, stored on the local `configurations` doc by the manager
 * app (Manager Settings -> Manage Sync). `intervalHours` is always resolved by
 * the app, so the preset is only carried through for display.
 */
export interface SyncSchedule {
  enabled: boolean;
  preset: SyncSchedulePreset;
  intervalHours: number;
}

export type TimedSyncSkipReason = 'noConfiguration' | 'alwaysOnline' | 'disabled' | 'noReplicators' | 'syncInProgress';

export type TimedSyncResult = 'success' | 'error';

export interface TimedSyncState {
  lastRunAt: number | null;
  lastResult: TimedSyncResult | null;
  lastError: string | null;
  replicatorCount: number | null;
}

export interface TimedSyncStatus extends TimedSyncState {
  enabled: boolean;
  preset: SyncSchedulePreset | null;
  intervalHours: number | null;
  nextRunAt: number | null;
  skipReason: TimedSyncSkipReason | null;
}
