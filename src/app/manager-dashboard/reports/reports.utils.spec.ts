import { endOfDay, filterByDate } from './reports.utils';

describe('reports.utils date filtering', () => {
  it('includes records that occur at 23:59:59.999 local time when end date is inclusive', () => {
    const startDate = new Date(2026, 2, 25);
    const endDate = new Date(2026, 2, 25);
    const records = [
      { time: new Date(2026, 2, 25, 23, 59, 59, 999).getTime() },
      { time: new Date(2026, 2, 26, 0, 0, 0, 0).getTime() }
    ];

    const filtered = filterByDate(records, 'time', { startDate, endDate });

    expect(filtered).toEqual([ records[0] ]);
  });

  it('normalizes end-of-day boundaries in local time', () => {
    const end = endOfDay(new Date(2026, 2, 25, 8, 45, 12, 123));

    expect(end).toEqual(new Date(2026, 2, 25, 23, 59, 59, 999));
  });
});
