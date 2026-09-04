import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService({} as any, {} as any, {} as any, {} as any, {} as any);
  });

  describe('appendUserDemographics', () => {

    const time = new Date(2026, 8, 4);

    it('adds the age and gender of the user who created the activity', () => {
      service.users = [ { name: 'ada', gender: 'female', birthDate: new Date(1998, 8, 4) } ];

      expect(service.appendUserDemographics([ { user: 'ada', time: 1 } ], time)).toEqual([
        { user: 'ada', time: 1, age: 28, gender: 'Female' }
      ]);
    });

    it('finds users of child planets, which are nested in a doc property', () => {
      service.users = [ { doc: { name: 'grace', gender: 'male', birthDate: new Date(2006, 0, 15) } } ];

      expect(service.appendUserDemographics([ { user: 'grace' } ], time)).toEqual([
        { user: 'grace', age: 20, gender: 'Male' }
      ]);
    });

    it('leaves demographics blank when the user or their birth date is unknown', () => {
      service.users = [ { name: 'ada' } ];

      expect(service.appendUserDemographics([ { user: 'ada' }, { user: 'nobody' } ], time)).toEqual([
        { user: 'ada', age: '', gender: '' },
        { user: 'nobody', age: '', gender: '' }
      ]);
    });

    it('keeps the demographics health examinations record for their anonymous profiles', () => {
      expect(service.appendUserDemographics([ { profileId: 'abc', age: 42, gender: 'male' } ], time)).toEqual([
        { profileId: 'abc', age: 42, gender: 'Male' }
      ]);
    });

  });

});
