import { ReportsService } from './reports.service';

describe('ReportsService', () => {

  const service = new ReportsService(
    null as any,
    null as any,
    null as any,
    null as any,
    null as any
  );

  describe('groupUsers', () => {

    it('groups direct and wrapped user records by their gender and join month', () => {
      const january = new Date(2025, 0, 1).valueOf();
      const february = new Date(2025, 1, 1).valueOf();
      const result = service.groupUsers([
        { gender: 'male', joinDate: new Date(2025, 0, 10).valueOf() },
        { doc: { gender: ' Female ', joinDate: new Date(2025, 0, 20).valueOf() } },
        { doc: { gender: 'other', joinDate: new Date(2025, 1, 5).valueOf() } }
      ]);

      expect(result.count).toBe(3);
      expect(result.byGender).toEqual({
        male: 1,
        female: 1,
        other: 1,
        didNotSpecify: 0
      });
      expect(result.byMonth.map(({ date, gender, count }) => ({ date, gender, count }))).toEqual([
        { date: january, gender: 'male', count: 1 },
        { date: january, gender: 'female', count: 1 },
        { date: february, gender: 'other', count: 1 }
      ]);
      expect(result.byMonth.every(({ date }) => !Number.isNaN(date))).toBe(true);
    });

  });

});
