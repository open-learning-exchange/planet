import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';

import { DeviceInfoService, DeviceType, SHORT_VIEWPORT_QUERY, ViewportState } from './device-info.service';

describe('DeviceInfoService', () => {

  const setup = (matchingQueries: string[]) => {
    TestBed.configureTestingModule({
      providers: [
        DeviceInfoService,
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: true }), isMatched: (query: string) => matchingQueries.includes(query) }
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

});
