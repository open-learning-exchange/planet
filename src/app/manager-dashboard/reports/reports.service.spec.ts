import { vi } from 'vitest';

import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const time = new Date(2026, 8, 4);

  beforeEach(() => {
    service = new ReportsService({} as any, {} as any, {} as any, {} as any, {} as any);
  });

  describe('appendGender', () => {

    it('takes the gender from the user profile so charts group on the raw values', () => {
      service.users = [ { name: 'ada', gender: 'female' } ];

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

    it('leaves the gender unset for records with no matching user', () => {
      service.users = [ { name: 'ada', gender: 'female' }, { birthDate: new Date(1998, 8, 4) } ];

      expect(service.appendGender([ { user: 'nobody' }, { profileId: 'abc' } ])).toEqual([
        { user: 'nobody', gender: undefined },
        { profileId: 'abc', gender: undefined }
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
      const grouped = service.groupUsers([ { gender: 'male' }, { gender: 'female' }, {} ]);

      expect(grouped.count).toBe(3);
      expect(grouped.byGender).toEqual({ male: 1, female: 1, didNotSpecify: 1 });
    });

    it('counts genders on the { doc: user } shape the members list passes', () => {
      const grouped = service.groupUsers([
        { _id: 'a', doc: { gender: 'male' } },
        { _id: 'b', doc: { gender: 'female' } },
        { _id: 'c', doc: { gender: 'female' } }
      ]);

      expect(grouped.byGender).toEqual({ male: 1, female: 2, didNotSpecify: 0 });
    });

    it('keeps the totals numeric for genders the chart has no bucket for', () => {
      const grouped = service.groupUsers([ { gender: 'nonbinary' }, { gender: 'Male' } ]);

      expect(grouped.byGender).toEqual({ male: 1, female: 0, didNotSpecify: 1 });
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
