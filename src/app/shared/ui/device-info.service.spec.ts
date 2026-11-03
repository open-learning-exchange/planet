import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject, of } from 'rxjs';

import { DeviceInfoService, DeviceType, SHORT_VIEWPORT_QUERY } from './device-info.service';

describe('DeviceInfoService', () => {

  const setup = (matchingQueries: string[], breakpoints$ = of({ matches: true }), viewportBreakpoints$ = breakpoints$) => {
    TestBed.configureTestingModule({
      providers: [
        DeviceInfoService,
        {
          provide: BreakpointObserver,
          useValue: {
            observe: (queries: string[]) => queries.includes(SHORT_VIEWPORT_QUERY) ? viewportBreakpoints$ : breakpoints$,
            isMatched: (query: string) => matchingQueries.includes(query)
          }
        }
      ]
    });
    return TestBed.inject(DeviceInfoService);
  };

  it('should report a short landscape phone as short without changing its width-based device type', () => {
    const service = setup([ '(max-width: 1000px)', SHORT_VIEWPORT_QUERY ]);

    expect(service.deviceType()).toBe(DeviceType.TABLET);
    expect(service.isShortViewport()).toBe(true);
    expect(service.usesOverlayNav()).toBe(true);
  });

  it('should keep the overlay nav through a rotation when the width stream emits first', () => {
    const matchingQueries = [ '(max-width: 1000px)', '(max-width: 780px)' ];
    const breakpoints$ = new BehaviorSubject({ matches: true });
    const viewportBreakpoints$ = new BehaviorSubject({ matches: true });
    const service = setup(matchingQueries, breakpoints$, viewportBreakpoints$);
    expect(service.usesOverlayNav()).toBe(true);

    matchingQueries.splice(1, 1, SHORT_VIEWPORT_QUERY);
    breakpoints$.next({ matches: true });
    expect(service.isMobile()).toBe(false);
    expect(service.usesOverlayNav()).toBe(true);

    viewportBreakpoints$.next({ matches: true });
    expect(service.isShortViewport()).toBe(true);
    expect(service.usesOverlayNav()).toBe(true);
  });

  it('should keep the device type and mobile signals in step with breakpoint changes', () => {
    const matchingQueries = [ '(max-width: 1000px)' ];
    const breakpoints$ = new BehaviorSubject({ matches: true });
    const service = setup(matchingQueries, breakpoints$);

    expect(service.deviceType()).toBe(DeviceType.TABLET);
    expect(service.isMobile()).toBe(false);

    matchingQueries.push('(max-width: 780px)');
    breakpoints$.next({ matches: true });

    expect(service.deviceType()).toBe(DeviceType.MOBILE);
    expect(service.isMobile()).toBe(true);
  });

});
