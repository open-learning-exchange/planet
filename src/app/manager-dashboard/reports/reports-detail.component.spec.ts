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
