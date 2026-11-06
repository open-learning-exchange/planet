import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject, of } from 'rxjs';

import { DeviceInfoService, DeviceType, SHORT_VIEWPORT_QUERY, ViewportState } from './device-info.service';

describe('DeviceInfoService', () => {

  const setup = (matchingQueries: string[], breakpoints$ = of({ matches: true })) => {
    TestBed.configureTestingModule({
      providers: [
        DeviceInfoService,
        {
          provide: BreakpointObserver,
          useValue: { observe: () => breakpoints$, isMatched: (query: string) => matchingQueries.includes(query) }
        }
      ]
    });
    return TestBed.inject(DeviceInfoService);
  };

  it('should report a short landscape phone as short without changing its width-based device type', () => {
    const service = setup([ '(max-width: 1000px)', SHORT_VIEWPORT_QUERY ]);
    let state: ViewportState;

    service.watchViewport().subscribe(viewport => state = viewport);

    expect(state).toEqual({ deviceType: DeviceType.TABLET, isShortViewport: true });
  });

  it('should keep the device signals in step with breakpoint changes', () => {
    const matchingQueries: string[] = [];
    const breakpoints$ = new BehaviorSubject({ matches: true });
    const service = setup(matchingQueries, breakpoints$);

    expect(service.deviceType()).toBe(DeviceType.DESKTOP);
    expect(service.isTabletOrSmaller()).toBe(false);

    matchingQueries.push('(max-width: 1000px)');
    breakpoints$.next({ matches: true });

    expect(service.deviceType()).toBe(DeviceType.TABLET);
    expect(service.isTabletOrSmaller()).toBe(true);
    expect(service.isMobile()).toBe(false);

    matchingQueries.push('(max-width: 780px)');
    breakpoints$.next({ matches: true });

    expect(service.deviceType()).toBe(DeviceType.MOBILE);
    expect(service.isMobile()).toBe(true);
  });

  it('should update the signals before notifying watchDeviceType subscribers', () => {
    const matchingQueries: string[] = [];
    const breakpoints$ = new BehaviorSubject({ matches: true });
    const service = setup(matchingQueries, breakpoints$);
    const seen: DeviceType[] = [];

    service.watchDeviceType().subscribe(() => seen.push(service.deviceType()));
    matchingQueries.push('(max-width: 780px)');
    breakpoints$.next({ matches: true });

    expect(seen).toEqual([ DeviceType.DESKTOP, DeviceType.MOBILE ]);
  });

});
