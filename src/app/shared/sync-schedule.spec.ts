import { clampSyncIntervalHours, defaultSyncSchedule, maxSyncIntervalHours, normalizeSyncSchedule } from './sync-schedule';

describe('sync schedule', () => {

  it('resolves the interval from the chosen preset', () => {
    expect(normalizeSyncSchedule({ enabled: true, preset: 'hourly', intervalHours: 99 }))
      .toEqual({ enabled: true, preset: 'hourly', intervalHours: 1 });
    expect(normalizeSyncSchedule({ enabled: true, preset: 'daily', intervalHours: 3 }))
      .toEqual({ enabled: true, preset: 'daily', intervalHours: 24 });
  });

  it('keeps the entered interval for a custom schedule', () => {
    expect(normalizeSyncSchedule({ enabled: true, preset: 'custom', intervalHours: 8 }))
      .toEqual({ enabled: true, preset: 'custom', intervalHours: 8 });
  });

  it('falls back to the default schedule for an unknown preset or a missing interval', () => {
    expect(normalizeSyncSchedule({ preset: 'fortnightly' } as any)).toEqual(defaultSyncSchedule);
    expect(normalizeSyncSchedule()).toEqual(defaultSyncSchedule);
    expect(normalizeSyncSchedule({ enabled: true, preset: 'custom' }).intervalHours)
      .toBe(defaultSyncSchedule.intervalHours);
  });

  it('clamps a custom interval to a range the gateway can act on', () => {
    expect(clampSyncIntervalHours(0)).toBe(1);
    expect(clampSyncIntervalHours(-5)).toBe(1);
    expect(clampSyncIntervalHours(1.4)).toBe(1);
    expect(clampSyncIntervalHours(500)).toBe(maxSyncIntervalHours);
  });

});
