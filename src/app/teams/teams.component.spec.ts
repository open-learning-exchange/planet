import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceType } from '../shared/device-info.service';
import { TeamsComponent } from './teams.component';

describe('TeamsComponent responsive displayedColumns', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const setup = (deviceType: DeviceType = DeviceType.DESKTOP) =>
    runInInjectionContext(TestBed.inject(EnvironmentInjector), () => new TeamsComponent(
      { get: () => ({ _id: 'u-1', roles: [] }) } as any,
      { checkAuthorization: vi.fn().mockReturnValue(of(true)) } as any,
      {} as any,
      {} as any,
      {} as any,
      { start: vi.fn(), stop: vi.fn() } as any,
      {} as any,
      { configuration: { planetType: 'community', code: 'c1' } } as any,
      { snapshot: { data: {} } } as any,
      { watchDeviceType: vi.fn().mockReturnValue(of(deviceType)) } as any
    ));

  it('sets all columns on desktop/tablet', () => {
    const component = setup(DeviceType.DESKTOP);
    component.setDisplayedColumns();
    expect(component.displayedColumns).toEqual([
      'doc.name', 'visitLog.lastVisit', 'visitLog.visitCount', 'doc.teamType', 'action'
    ]);
  });

  it('streamlines columns on mobile to ensure action column fits on screen', () => {
    const component = setup(DeviceType.MOBILE);
    component.setDisplayedColumns();
    expect(component.displayedColumns).toEqual([
      'doc.name', 'action'
    ]);
  });

  it('uses dialog-specific columns on mobile when in dialog mode', () => {
    const component = setup(DeviceType.MOBILE);
    component.isDialog = true;
    component.setDisplayedColumns();
    expect(component.displayedColumns).toEqual([
      'doc.name', 'doc.teamType'
    ]);
  });
});
