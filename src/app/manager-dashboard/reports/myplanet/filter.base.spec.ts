import { FormBuilder, NonNullableFormBuilder } from '@angular/forms';

import { MyPlanetFiltersBase } from './filter.base';
import { FuzzySearchService } from '../../../shared/fuzzy-search.service';
import { ReportsService } from '../reports.service';

class TestMyPlanetFilters extends MyPlanetFiltersBase {

  allPlanets: any[] = [];
  filteredPlanets: any[] = [];

  constructor(fb: NonNullableFormBuilder, activityService: ReportsService, fuzzySearchService: FuzzySearchService) {
    super(fb, activityService, fuzzySearchService, 'all');
  }

  applyFilters() {
    this.filteredPlanets = this.filterPlanetsBySearch(this.allPlanets, children => children);
  }

}

describe('MyPlanetFiltersBase search', () => {
  let component: TestMyPlanetFilters;

  const activityServiceMock = {
    standardTimeFilters: [],
    getDateRange: () => ({ startDate: new Date(0), endDate: new Date(), showCustomDateFields: false })
  } as unknown as ReportsService;

  const planets = () => [
    {
      name: 'Alpha Community',
      doc: { code: 'alpha' },
      children: [ { androidId: 'aaa111', deviceName: 'Tablet One', customDeviceName: 'Front Desk' } ]
    },
    {
      name: 'Beta Community',
      doc: { code: 'beta' },
      children: [
        { androidId: 'bbb222', deviceName: 'Tablet Two', customDeviceName: 'Library' },
        { uniqueAndroidId: 'ccc333', deviceName: 'Tablet Three' },
        { androidId: 12345678, deviceName: 'Tablet Four' }
      ]
    }
  ];

  const search = (searchValue: string) => {
    component.filterData(searchValue);
    return component.filteredPlanets;
  };

  beforeEach(() => {
    component = new TestMyPlanetFilters(new FormBuilder().nonNullable, activityServiceMock, new FuzzySearchService());
    component.allPlanets = planets();
  });

  it('keeps every planet and child when there is no search value', () => {
    const results = search('');
    expect(results.length).toBe(2);
    expect(results[1].children.length).toBe(3);
  });

  it('keeps all children of a planet matching by name or code', () => {
    expect(search('Beta Community')[0].children.length).toBe(3);
    expect(search('alpha').map(planet => planet.name)).toEqual([ 'Alpha Community' ]);
  });

  it('matches devices by name, keeping only the matching devices', () => {
    const results = search('Library');
    expect(results.map(planet => planet.name)).toEqual([ 'Beta Community' ]);
    expect(results[0].children.map(child => child.androidId)).toEqual([ 'bbb222' ]);
  });

  it('matches devices by androidId and uniqueAndroidId', () => {
    expect(search('bbb222')[0].children.map(child => child.deviceName)).toEqual([ 'Tablet Two' ]);
    expect(search('ccc333')[0].children.map(child => child.deviceName)).toEqual([ 'Tablet Three' ]);
  });

  it('matches devices with a non string id', () => {
    expect(search('3456')[0].children.map(child => child.deviceName)).toEqual([ 'Tablet Four' ]);
  });

  it('fuzzy matches misspelled device names', () => {
    expect(search('Libary')[0].children.map(child => child.androidId)).toEqual([ 'bbb222' ]);
  });

  it('removes planets with no matching name or devices', () => {
    expect(search('no such device')).toEqual([]);
  });

});
