import { vi } from 'vitest';
import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { ReportsDetailComponent } from './reports-detail.component';
import { ReportsService } from './reports.service';

describe('ReportsDetailComponent exports', () => {

  const createComponent = (activityService: any = {}) => {
    const csvService = { exportCSV: vi.fn() };
    const component = new ReportsDetailComponent(
      activityService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { start: vi.fn(), stop: vi.fn() } as any,
      csvService as any,
      { closeDialogsForm: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new FormBuilder().nonNullable,
      { watchDeviceType: () => of('desktop') } as any,
      {} as any,
      'en-US'
    );

    return { component, csvService };
  };

  describe('sortData', () => {

    it('orders the chat exports on their numeric createdDate', () => {
      const { component } = createComponent();
      const chats = [ { createdDate: 3 }, { createdDate: 1 }, { createdDate: 2 } ];

      expect(component.sortData(chats, 'createdDateAsc').map(chat => chat.createdDate)).toEqual([ 1, 2, 3 ]);
      expect(component.sortData(chats, 'createdDateDesc').map(chat => chat.createdDate)).toEqual([ 3, 2, 1 ]);
    });

    it('sorts on a field the older records never stored', () => {
      const { component } = createComponent();
      const chats = [ { aiProvider: 'openai' }, {}, { aiProvider: 'gemini' } ];

      expect(component.sortData(chats, 'aiProviderAsc').map(chat => chat.aiProvider)).toEqual([
        undefined, 'gemini', 'openai'
      ]);
      expect(component.sortData([ { user: 'ada' }, {} ], 'usernameAsc').map(login => login.user)).toEqual([
        undefined, 'ada'
      ]);
    });

    it('keeps ordering dates by their value, not their text', () => {
      const { component } = createComponent();
      const logins = [ { loginTime: new Date(2026, 8, 4).valueOf() }, { loginTime: new Date(2026, 0, 9).valueOf() } ];

      expect(component.sortData(logins, 'loginTimeAsc')[0].loginTime).toBe(new Date(2026, 0, 9).valueOf());
    });

  });

  describe('exportChatData', () => {

    const chatActivities = [ {
      user: 'ada',
      createdDate: new Date(2026, 8, 1).valueOf(),
      aiProvider: 'openai',
      conversations: [ { query: 'hello' } ]
    } ];

    it('exports the gender and age of the member who created each chat', () => {
      const activityService = new ReportsService({} as any, {} as any, {} as any, {} as any, {} as any);
      activityService.users = [ { name: 'ada', gender: 'female', birthDate: new Date(1998, 8, 4) } ];
      const { component, csvService } = createComponent(activityService);
      component.today = new Date(2026, 8, 4);
      component.chatActivities = { data: chatActivities } as any;

      component.exportChatData({ startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 4) }, [], 'createdDateAsc');

      const [ { data } ] = csvService.exportCSV.mock.calls[0];
      expect(data[0]['Gender']).toBe('Female');
      expect(data[0]['Age (years)']).toBe(28);
      expect(data[0]['Chat Responses']).toBe(1);
    });

    it('builds the rows without copying the conversations off the chat document', () => {
      const activityService = new ReportsService({} as any, {} as any, {} as any, {} as any, {} as any);
      activityService.users = [];
      const { component, csvService } = createComponent(activityService);
      component.today = new Date(2026, 8, 4);
      component.chatActivities = { data: chatActivities } as any;

      component.exportChatData({ startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 4) }, [], null);

      const [ { data } ] = csvService.exportCSV.mock.calls[0];
      expect(data[0]).not.toHaveProperty('conversations');
      expect(data[0]['Gender']).toBe('');
      expect(data[0]['Age (years)']).toBe('');
    });

  });

});

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
    component.activityService = { appendUserDemographics: activities => activities, appendAge: activities => activities };
    component.resourceActivities = { total: { data: [] } };
    component.courseActivities = { total: { data: [] } };
    component.progress = { steps: { data: [] } };
  });

  it('exports a localized source and user demographics instead of the raw app value for logins', () => {
    const activityService = new ReportsService({} as any, {} as any, {} as any, {} as any, {} as any);
    activityService.users = [ { name: 'learner', gender: 'female', birthDate: new Date(1998, 0, 15) } ];
    component.activityService = activityService;
    component.today = new Date(2026, 0, 15);
    component.loginActivities = {
      data: [ { app: 'myplanet-lite', androidId: 'device-1', loginTime: timestamp, user: 'learner' } ]
    };

    component.exportCSV('logins', dateRange, [], '');

    const exportedRow = csvService.exportCSV.mock.calls[0][0].data[0];
    expect(exportedRow.app).toBeUndefined();
    expect(exportedRow[$localize`Source`]).toBe('myPlanet Lite');
    expect(exportedRow[$localize`Gender`]).toBe('Female');
    expect(exportedRow[$localize`Age (years)`]).toBe(28);
  });

  it('exports a localized source and user demographics for resource views', () => {
    const activityService = new ReportsService({} as any, {} as any, {} as any, {} as any, {} as any);
    activityService.users = [ { name: 'learner', gender: 'female', birthDate: new Date(1998, 0, 15) } ];
    component.activityService = activityService;
    component.today = new Date(2026, 0, 15);
    component.resourceActivities.total.data = [
      { app: 'myplanet-lite', androidId: 'device-1', time: timestamp, user: 'learner' }
    ];

    component.exportCSV('resourceViews', dateRange, [], '');

    const exportedRow = csvService.exportCSV.mock.calls[0][0].data[0];
    expect(exportedRow.app).toBeUndefined();
    expect(exportedRow[$localize`Source`]).toBe('myPlanet Lite');
    expect(exportedRow[$localize`Gender`]).toBe('Female');
    expect(exportedRow[$localize`Age (years)`]).toBe(28);
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
