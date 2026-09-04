export type SyncSchedulePreset = 'hourly' | 'every3Hours' | 'every6Hours' | 'every12Hours' | 'daily' | 'custom';

export type TimedSyncSkipReason = 'noConfiguration' | 'alwaysOnline' | 'disabled' | 'noReplicators' | 'syncInProgress';

// Stored on the local configuration doc and read by the gateway, which runs the
// timed syncs. `intervalHours` is always resolved here so the gateway never has
// to know what a preset means.
export interface SyncSchedule {
  enabled: boolean;
  preset: SyncSchedulePreset;
  intervalHours: number;
}

export interface TimedSyncStatus {
  enabled: boolean;
  preset: SyncSchedulePreset | null;
  intervalHours: number | null;
  lastRunAt: number | null;
  nextRunAt: number | null;
  lastResult: 'success' | 'error' | null;
  lastError: string | null;
  replicatorCount: number | null;
  skipReason: TimedSyncSkipReason | null;
}

export const minSyncIntervalHours = 1;
export const maxSyncIntervalHours = 168;

export const syncSchedulePresets: { value: SyncSchedulePreset, label: string, intervalHours?: number }[] = [
  { value: 'hourly', label: $localize`Hourly`, intervalHours: 1 },
  { value: 'every3Hours', label: $localize`Every 3 hours`, intervalHours: 3 },
  { value: 'every6Hours', label: $localize`Every 6 hours`, intervalHours: 6 },
  { value: 'every12Hours', label: $localize`Every 12 hours`, intervalHours: 12 },
  { value: 'daily', label: $localize`Daily`, intervalHours: 24 },
  { value: 'custom', label: $localize`Every x hours` }
];

export const defaultSyncSchedule: SyncSchedule = { enabled: false, preset: 'daily', intervalHours: 24 };

export const presetIntervalHours = (preset: SyncSchedulePreset): number | undefined =>
  syncSchedulePresets.find(option => option.value === preset)?.intervalHours;

export const clampSyncIntervalHours = (hours: number): number => {
  const rounded = Math.round(Number(hours));
  if (!Number.isFinite(rounded)) {
    return defaultSyncSchedule.intervalHours;
  }
  return Math.min(Math.max(rounded, minSyncIntervalHours), maxSyncIntervalHours);
};

export const normalizeSyncSchedule = (schedule: Partial<SyncSchedule> = {}): SyncSchedule => {
  const preset = syncSchedulePresets.some(option => option.value === schedule.preset) ?
    schedule.preset : defaultSyncSchedule.preset;
  return {
    enabled: schedule.enabled === true,
    preset,
    intervalHours: clampSyncIntervalHours(presetIntervalHours(preset) ?? schedule.intervalHours)
  };
};
