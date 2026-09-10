import { vi } from 'vitest';

import { ReportsDetailComponent } from './reports-detail.component';

describe('ReportsDetailComponent time frame defaults', () => {
  const buildComponent = (selectedTimeFilter: string, startDate: Date) => {
    const component = Object.create(ReportsDetailComponent.prototype) as ReportsDetailComponent;
    component.selectedTimeFilter = selectedTimeFilter;
    component.filter = { app: '', members: [], startDate, endDate: new Date(2025, 5, 1) };
    component.minDate = new Date(2018, 6, 1);
    return component;
  };

  it('seeds the custom range with the dates already on screen', () => {
    const patchValue = vi.fn();
    const twelveMonthsAgo = new Date(2024, 5, 1);
    const component = buildComponent('12m', twelveMonthsAgo);
    component.dateFilterForm = { patchValue } as any;
    (component as any).activityService = {
      getDateRange: () => ({ startDate: null, endDate: null, showCustomDateFields: true })
    };

    component.onTimeFilterChange('custom');

    expect(patchValue).toHaveBeenCalledWith({ startDate: twelveMonthsAgo, endDate: new Date(2025, 5, 1) });
  });

  it('follows the selected time frame rather than a fixed default', () => {
    const component = buildComponent('12m', new Date(2024, 5, 1));
    const getDateRange = vi.fn(() => ({ startDate: new Date(2024, 0, 2), endDate: new Date(), showCustomDateFields: false }));
    (component as any).activityService = { getDateRange };

    expect((component as any).defaultStartDate()).toEqual(new Date(2024, 0, 2));
    expect(getDateRange).toHaveBeenCalledWith('12m', component.minDate);
  });
});

describe('ReportsDetailComponent exports', () => {
  let component: any;
  let csvService: { exportCSV: ReturnType<typeof vi.fn> };
  const timestamp = new Date(2026, 0, 15).getTime();
  const dateRange = { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 31) };

  beforeEach(() => {
    csvService = { exportCSV: vi.fn() };
    component = Object.create(ReportsDetailComponent.prototype);
    component.csvService = csvService;
    component.dialogsFormService = { closeDialogsForm: vi.fn() };
    component.dialogsLoadingService = { stop: vi.fn() };
    component.resourceActivities = { total: { data: [] } };
    component.courseActivities = { total: { data: [] } };
    component.progress = { steps: { data: [] } };
  });

  it('replaces the raw app value with a localized source label in login exports', () => {
    component.loginActivities = {
      data: [ { app: 'myplanet-lite', androidId: 'device-1', loginTime: timestamp } ]
    };

    component.exportCSV('logins', dateRange, [], '');

    const exportedRow = csvService.exportCSV.mock.calls[0][0].data[0];
    expect(exportedRow.app).toBeUndefined();
    expect(exportedRow[$localize`Source`]).toBe('myPlanet Lite');
  });

  it('does not assign an app source to health exports without provenance', () => {
    component.healthComponent = {
      examinations: [ { androidId: 'device-1', date: timestamp, user: 'learner' } ]
    };
    component.activityService = { appendAge: activities => activities };
    component.today = new Date(2026, 0, 31);

    component.exportCSV('health', dateRange, [], '');

    const exportedRow = csvService.exportCSV.mock.calls[0][0].data[0];
    expect(exportedRow.app).toBeUndefined();
    expect(exportedRow[$localize`Source`]).toBeUndefined();
  });
});
