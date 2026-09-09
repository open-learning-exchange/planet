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

    it('finds users of child planets, which are nested in a doc property', () => {
      service.users = [ { doc: { name: 'grace', gender: 'male' } } ];

      expect(service.appendGender([ { user: 'grace' } ])).toEqual([ { user: 'grace', gender: 'male' } ]);
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

});
