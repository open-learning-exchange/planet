import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { DeviceInfoService, DEFAULT_SHORT_VIEWPORT_HEIGHT } from './device-info.service';

describe('DeviceInfoService', () => {

  let service: DeviceInfoService;
  let matches: BehaviorSubject<{ matches: boolean }>;
  let observe: ReturnType<typeof vi.fn>;
  let isMatched: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matches = new BehaviorSubject({ matches: false });
    observe = vi.fn().mockReturnValue(matches.asObservable());
    isMatched = vi.fn().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [ DeviceInfoService, { provide: BreakpointObserver, useValue: { observe, isMatched } } ]
    });
    service = TestBed.inject(DeviceInfoService);
  });

  it('should test short viewports against height, not width', () => {
    service.watchShortViewport();

    expect(observe).toHaveBeenCalledWith(`(max-height: ${DEFAULT_SHORT_VIEWPORT_HEIGHT}px)`);
  });

  it('should report the current short viewport state synchronously', () => {
    expect(service.isShortViewport()).toBe(true);
    expect(isMatched).toHaveBeenCalledWith(`(max-height: ${DEFAULT_SHORT_VIEWPORT_HEIGHT}px)`);
  });

  it('should accept a custom height', () => {
    service.watchShortViewport(320);

    expect(observe).toHaveBeenCalledWith('(max-height: 320px)');
  });

  it('should emit when the viewport becomes short', () => {
    const emitted: boolean[] = [];
    service.watchShortViewport().subscribe(isShort => emitted.push(isShort));

    matches.next({ matches: true });

    expect(emitted).toEqual([ false, true ]);
  });

  it('should not re-emit an unchanged state', () => {
    const emitted: boolean[] = [];
    service.watchShortViewport().subscribe(isShort => emitted.push(isShort));

    matches.next({ matches: true });
    matches.next({ matches: true });

    expect(emitted).toEqual([ false, true ]);
  });

  it('should share one stream per height so each caller does not add an observer', () => {
    const first = service.watchShortViewport();
    first.subscribe();
    const second = service.watchShortViewport();
    second.subscribe();

    expect(second).toBe(first);
    expect(observe).toHaveBeenCalledTimes(1);
  });

});
