import { vi } from 'vitest';

import { ReportsService } from './reports.service';
import { demographicsForCsv } from './reports.utils';

describe('ReportsService', () => {
  let service: ReportsService;

  const time = new Date(2026, 8, 4);

  beforeEach(() => {
    service = new ReportsService({} as any, {} as any, {} as any, {} as any, {} as any);
  });

  describe('appendGender', () => {

    it('takes the gender from the user profile and normalizes it for the charts', () => {
      service.users = [ { name: 'ada', gender: ' Female ' } ];

      expect(service.appendGender([ { user: 'ada', gender: 'Female' } ])).toEqual([ { user: 'ada', gender: 'female' } ]);
    });

    it('finds users loaded from a child planet', () => {
      service.users = [ { name: 'grace', gender: 'male', planetCode: 'child' } ];

      expect(service.appendGender([ { user: 'grace' } ])).toEqual([ { user: 'grace', gender: 'male' } ]);
    });

    it('preserves the first matching profile when names are duplicated', () => {
      service.users = [ { name: 'ada', gender: 'female' }, { name: 'ada', gender: 'male' } ];

      expect(service.appendGender([ { user: 'ada' } ])).toEqual([ { user: 'ada', gender: 'female' } ]);
    });

    it('buckets records with no matching user as did not specify', () => {
      service.users = [ { name: 'ada', gender: 'female' }, { birthDate: new Date(1998, 8, 4) } ];

      expect(service.appendGender([ { user: 'nobody' }, { profileId: 'abc' } ])).toEqual([
        { user: 'nobody', gender: 'didNotSpecify' },
        { profileId: 'abc', gender: 'didNotSpecify' }
      ]);
    });

  });

  describe('appendAge', () => {

    it('counts the age from the birth date on the user profile', () => {
      service.users = [ { name: 'ada', birthDate: new Date(1998, 8, 4) } ];

      expect(service.appendAge([ { user: 'ada', time: 1 } ], time)).toEqual([ { user: 'ada', time: 1, age: 28 } ]);
    });

    it('keeps the age health examinations store for their anonymous profiles', () => {
      expect(service.appendAge([ { profileId: 'abc', age: 42 } ], time)).toEqual([ { profileId: 'abc', age: 42 } ]);
    });

    it('uses the stored age when the user profile has no birth date', () => {
      service.users = [ { name: 'ada', birthYear: 1998, age: 28 } ];

      expect(service.appendAge([ { user: 'ada' } ], time)).toEqual([ { user: 'ada', age: 28 } ]);
    });

    it('leaves the age blank when the user or their birth date is unknown', () => {
      service.users = [ { name: 'ada' } ];

      expect(service.appendAge([ { user: 'ada' }, { user: 'nobody' } ], time)).toEqual([
        { user: 'ada', age: '' },
        { user: 'nobody', age: '' }
      ]);
    });

  });

  describe('appendUserDemographics', () => {

    it('adds the age and the gender of the user who created the activity', () => {
      service.users = [ { name: 'ada', gender: 'female', birthDate: new Date(1998, 8, 4) } ];

      expect(service.appendUserDemographics([ { user: 'ada', time: 1 } ], time)).toEqual([
        { user: 'ada', time: 1, age: 28, gender: 'female' }
      ]);
    });

    it('keeps the gender raw so an unmatched profile exports a blank cell', () => {
      service.users = [ { name: 'ada', gender: 'female' } ];

      const [ unmatched ] = service.appendUserDemographics([ { user: 'nobody' } ], time);

      expect(unmatched.gender).toBeUndefined();
      expect(demographicsForCsv(unmatched).Gender).toBe('');
    });

  });

  describe('demographicsFor', () => {

    it('reads one record at a time without copying it', () => {
      service.users = [ { name: 'ada', gender: 'female', birthDate: new Date(1998, 8, 4) } ];

      const demographics = service.demographicsFor(time);

      expect(demographics({ user: 'ada', conversations: [ 'unrelated' ] })).toEqual({ age: 28, gender: 'female' });
    });

  });

  describe('groupUsers', () => {

    it('counts genders on the raw user docs', () => {
      const grouped = service.groupUsers([ { gender: 'male' }, { gender: 'female' }, { gender: 'other' }, {}, { gender: ' ' } ]);

      expect(grouped.count).toBe(5);
      expect(grouped.byGender).toEqual({ male: 1, female: 1, other: 1, didNotSpecify: 2 });
    });

    it('counts genders on the { doc: user } shape the members list passes', () => {
      const grouped = service.groupUsers([
        { _id: 'a', doc: { gender: 'male' } },
        { _id: 'b', doc: { gender: 'female' } },
        { _id: 'c', doc: { gender: 'female' } }
      ]);

      expect(grouped.byGender).toEqual({ male: 1, female: 2, other: 0, didNotSpecify: 0 });
    });

    it('keeps the totals numeric for genders the chart has no bucket for', () => {
      const grouped = service.groupUsers([ { gender: 'nonbinary' }, { gender: 'Male' }, { gender: ' female ' }, { gender: 1 } ]);

      expect(grouped.byGender).toEqual({ male: 1, female: 1, other: 0, didNotSpecify: 2 });
    });

    it('groups direct and wrapped user records by their gender and join month', () => {
      const january = new Date(2025, 0, 1).valueOf();
      const february = new Date(2025, 1, 1).valueOf();
      const result = service.groupUsers([
        { gender: 'male', joinDate: new Date(2025, 0, 10).valueOf() },
        { doc: { gender: ' Female ', joinDate: new Date(2025, 0, 20).valueOf() } },
        { doc: { gender: 'other', joinDate: new Date(2025, 1, 5).valueOf() } }
      ]);

      expect(result.count).toBe(3);
      expect(result.byGender).toEqual({ male: 1, female: 1, other: 1, didNotSpecify: 0 });
      expect(result.byMonth.map(({ date, gender, count }) => ({ date, gender, count }))).toEqual([
        { date: january, gender: 'male', count: 1 },
        { date: january, gender: 'female', count: 1 },
        { date: february, gender: 'other', count: 1 }
      ]);
      expect(result.byMonth.every(({ date }) => !Number.isNaN(date))).toBe(true);
    });

  });

});

describe('ReportsService.getDateRange', () => {
  const service = Object.create(ReportsService.prototype) as ReportsService;
  const minDate = new Date(2018, 6, 1);

  const atTime = (date: Date) => {
    vi.useFakeTimers();
    vi.setSystemTime(date);
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clamps a month end start date to the last day of the target month', () => {
    atTime(new Date(2025, 4, 31, 14, 30));

    // Unclamped, subtracting three months from May 31 overflows Feb 31 into Mar 3.
    expect(service.getDateRange('3m', minDate).startDate).toEqual(new Date(2025, 1, 28));
  });

  it('clamps a leap day start date when going back a year', () => {
    atTime(new Date(2024, 1, 29, 9, 15));

    expect(service.getDateRange('12m', minDate).startDate).toEqual(new Date(2023, 1, 28));
  });

  it('does not let the start date calculation move the end of the range', () => {
    atTime(new Date(2025, 4, 31, 14, 30));

    expect(service.getDateRange('3m', minDate).endDate).toEqual(new Date(2025, 4, 31, 14, 30));
  });

  it('leaves the day and hour ranges rolling', () => {
    atTime(new Date(2025, 4, 31, 14, 30));

    expect(service.getDateRange('7d', minDate).startDate).toEqual(new Date(2025, 4, 24, 14, 30));
    expect(service.getDateRange('24h', minDate).startDate).toEqual(new Date(2025, 4, 30, 14, 30));
  });
});
