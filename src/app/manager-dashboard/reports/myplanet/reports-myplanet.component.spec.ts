import { vi } from 'vitest';
import { ReportsService } from '../reports.service';
import { MyPlanetTableComponent } from './myplanet-table.component';
import { ReportsMyPlanetComponent } from './reports-myplanet.component';

describe('ReportsMyPlanetComponent', () => {
  let component: any;
  const community = { doc: { code: 'community-1' } };
  const fullAppTime = new Date(2026, 0, 10).getTime();
  const liteAppTime = new Date(2026, 0, 11).getTime();

  beforeEach(() => {
    component = Object.create(ReportsMyPlanetComponent.prototype);
    component.reportsService = { groupBy: ReportsService.prototype.groupBy };
    component.selectedVersion = '';
    component.startDate = new Date(2026, 0, 1);
    component.endDate = new Date(2026, 0, 31);
    component.localeId = 'en-US';
    component.timePipe = { transform: vi.fn(value => `${value}`) };
  });

  it('keeps myPlanet and myPlanet Lite activity from the same device in separate groups', () => {
    component.setAllPlanets([ community ], [
      {
        androidId: 'device-1',
        createdOn: 'community-1',
        deviceName: 'Full App Device',
        time: fullAppTime,
        totalUsed: 10,
        versionName: '1.0'
      },
      {
        app: 'myplanet-lite',
        createdOn: 'community-1',
        type: 'usages',
        usages: [ {
          androidId: 'device-1',
          deviceName: 'Lite App Device',
          time: liteAppTime,
          totalUsed: 20,
          versionName: '2.0'
        } ]
      }
    ]);

    const children = component.allPlanets[0].children;
    expect(children).toHaveLength(2);
    expect(children.map(child => child.appSource)).toEqual([ 'myplanet', 'myplanet-lite' ]);
    expect(children.map(child => child.source)).toEqual([ 'myPlanet', 'myPlanet Lite' ]);

    const csvRows = component.mapToCsvData(children);
    expect(csvRows.map(row => row[$localize`Source`])).toEqual([ 'myPlanet', 'myPlanet Lite' ]);
  });

  it('does not flatten usages arrays on non-usage activity documents', () => {
    const groups = component.myPlanetGroups(community, [ {
      androidId: 'device-1',
      createdOn: 'community-1',
      time: fullAppTime,
      totalUsed: 10,
      type: 'sync',
      usages: [ { time: liteAppTime, totalUsed: 20 } ]
    } ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].androidId).toBe('device-1');
    expect(groups[0].sum).toBe(10);
  });

  it('exports an empty device ID when neither identifier is available', () => {
    const csvRow = component.mapToCsvData([ { count: 1, source: 'myPlanet', totalUsedTime: 0 } ])[0];

    expect(csvRow[$localize`ID`]).toBe('');
  });
});

describe('MyPlanetTableComponent', () => {
  it('shows the source column for reports but not logs', () => {
    const reportTable = new MyPlanetTableComponent({} as any);
    reportTable.ngOnInit();
    const logsTable = new MyPlanetTableComponent({} as any);
    logsTable.dataType = 'logs';
    logsTable.ngOnInit();

    expect(reportTable.displayedColumns).toContain('source');
    expect(logsTable.displayedColumns).not.toContain('source');
  });
});
