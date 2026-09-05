import { ReportsDetailData } from './reports-detail-data';
import { ACTIVITY_DATE_FIELDS } from './reports.constants';

describe('ReportsDetailData', () => {
  const dateRange = { startDate: new Date(2026, 0, 2), endDate: new Date(2026, 0, 4) };

  const loginData = () => {
    const activities = new ReportsDetailData(ACTIVITY_DATE_FIELDS.login);
    activities.data = [
      { user: 'ada', loginTime: new Date(2026, 0, 1).getTime() },
      { user: 'ada', loginTime: new Date(2026, 0, 3).getTime() },
      { user: 'grace', loginTime: new Date(2026, 0, 3).getTime() },
      { user: 'grace', loginTime: new Date(2026, 0, 9).getTime() }
    ];
    return activities;
  };

  it('filters by its own date field', () => {
    expect(loginData().inRange(dateRange)).toEqual([
      { user: 'ada', loginTime: new Date(2026, 0, 3).getTime() },
      { user: 'grace', loginTime: new Date(2026, 0, 3).getTime() }
    ]);
  });

  it('narrows to the given members', () => {
    const members = [ { userId: 'org.couchdb.user:ada' } ];

    expect(loginData().inRange(dateRange, members)).toEqual([ { user: 'ada', loginTime: new Date(2026, 0, 3).getTime() } ]);
  });

  it('keeps every member when none are given', () => {
    expect(loginData().inRange(dateRange, []).length).toBe(2);
  });

  it('ranges over the already filtered data', () => {
    const activities = loginData();
    activities.filter({ app: '', members: [], startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 3) });

    expect(activities.filteredInRange(dateRange)).toEqual([
      { user: 'ada', loginTime: new Date(2026, 0, 3).getTime() },
      { user: 'grace', loginTime: new Date(2026, 0, 3).getTime() }
    ]);
  });
});
