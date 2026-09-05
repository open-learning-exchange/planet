import { ReportsDetailData } from './reports-detail-data';
import { isThursday, lastCompletedThursday, lastThursday, thursdayWeekRangeFromEnd } from './reports.utils';

describe('comparison trend date helpers', () => {

  /* 2026-09-03 is a Thursday, 2026-09-05 a Saturday. */
  const thursday = new Date(2026, 8, 3);
  const saturday = new Date(2026, 8, 5);

  it('identifies Thursdays so the pickers can only land on a week boundary', () => {
    expect(isThursday(thursday)).toBe(true);
    expect(isThursday(saturday)).toBe(false);
  });

  it('steps back a week when today is itself a Thursday so the week is complete', () => {
    expect(lastThursday(thursday).getDate()).toBe(3);
    expect(lastCompletedThursday(thursday).getDate()).toBe(27);
  });

  it('keeps the most recent Thursday when today is mid-week', () => {
    expect(lastCompletedThursday(saturday).getDate()).toBe(3);
  });

  it('builds a seven day range ending on the given Thursday', () => {
    const { startDate, endDate } = thursdayWeekRangeFromEnd(thursday);

    expect(startDate.getDate()).toBe(28);
    expect(endDate.getDate()).toBe(3);
  });

  it('produces adjacent non-overlapping weeks for consecutive Thursdays', () => {
    const previousThursday = new Date(2026, 7, 27);
    const week1 = thursdayWeekRangeFromEnd(previousThursday);
    const week2 = thursdayWeekRangeFromEnd(thursday);

    expect(week1.endDate.getTime()).toBeLessThan(week2.startDate.getTime());
  });

});

describe('ReportsDetailData.slice', () => {

  const day = (date: number) => new Date(2026, 8, date).getTime();
  const emptyFilter = { app: '' as const, members: [] };

  const build = () => {
    const data = new ReportsDetailData('time');
    data.data = [
      { time: day(1), user: 'a' },
      { time: day(10), user: 'b', androidId: 'device-1' },
      { time: day(20), user: 'c' }
    ];
    return data;
  };

  it('does not disturb filteredData', () => {
    const data = build();
    data.filter({ ...emptyFilter, startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 30) });
    const before = data.filteredData;

    data.slice({ ...emptyFilter, startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 5) });

    expect(data.filteredData).toBe(before);
    expect(data.filteredData.length).toBe(3);
  });

  it('reads the full dataset, not the narrowed view, so ranges do not intersect', () => {
    const data = build();
    /* A toolbar window covering only the first week. */
    data.filter({ ...emptyFilter, startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 5) });

    const later = data.slice({ ...emptyFilter, startDate: new Date(2026, 8, 15), endDate: new Date(2026, 8, 25) });

    expect(data.filteredData.length).toBe(1);
    expect(later.length).toBe(1);
    expect(later[0].user).toBe('c');
  });

  it('applies the app source filter it is handed', () => {
    const data = build();
    const range = { startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 30) };

    expect(data.slice({ ...emptyFilter, ...range, app: 'myplanet' }).length).toBe(1);
    expect(data.slice({ ...emptyFilter, ...range, app: 'planet' }).length).toBe(2);
    expect(data.slice({ ...emptyFilter, ...range }).length).toBe(3);
  });

});
