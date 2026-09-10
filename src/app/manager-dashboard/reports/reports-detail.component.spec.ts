import { ReportsDetailComponent } from './reports-detail.component';
import { vi } from 'vitest';

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
