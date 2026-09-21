import { demographicsForCsv, formatDemographicsForCsv, isSelectedMember } from './reports.utils';

describe('reports utils', () => {

  describe('isSelectedMember', () => {

    it('matches an associated member by the login name their activities record, not a same-named native account', () => {
      const associated = [ { userId: 'org.couchdb.user:ann', userPlanetCode: 'community', teamPlanetCode: 'nation' } ];
      const native = [ { userId: 'org.couchdb.user:ann', userPlanetCode: '', teamPlanetCode: 'nation' } ];

      expect(isSelectedMember({ user: 'ann@community' }, associated)).toBe(true);
      expect(isSelectedMember({ userId: 'org.couchdb.user:ann@community' }, associated)).toBe(true);
      expect(isSelectedMember({ user: 'ann' }, associated)).toBe(false);
      expect(isSelectedMember({ user: 'ann' }, native)).toBe(true);
      expect(isSelectedMember({ user: 'ann@community' }, native)).toBe(false);
    });

  });

  describe('demographicsForCsv', () => {

    it('localizes the gender and keeps the age under the shared headers', () => {
      expect(demographicsForCsv({ gender: 'FEMALE', age: 28 })).toEqual({ Gender: 'Female', 'Age (years)': 28 });
    });

    it('renders both columns blank when the record has no matching profile', () => {
      expect(demographicsForCsv({})).toEqual({ Gender: '', 'Age (years)': '' });
      expect(demographicsForCsv(undefined)).toEqual({ Gender: '', 'Age (years)': '' });
    });

    it('keeps a zero age', () => {
      expect(demographicsForCsv({ age: 0 })['Age (years)']).toBe(0);
    });

  });

  describe('formatDemographicsForCsv', () => {

    it('replaces raw demographic keys with localized headers and values', () => {
      const formatted = formatDemographicsForCsv({ user: 'ada', gender: 'female', source: 'health', age: 28, time: 1 });

      expect(formatted).toEqual({
        user: 'ada',
        Gender: 'Female',
        source: 'health',
        'Age (years)': 28,
        time: 1
      });
      expect(Object.keys(formatted)).toEqual([ 'user', 'Gender', 'source', 'Age (years)', 'time' ]);
    });

    it('adds the columns a record never stored, so the headers taken from the first row are complete', () => {
      const formatted = formatDemographicsForCsv({ user: 'ada', time: 1 });

      expect(formatted).toEqual({ user: 'ada', time: 1, Gender: '', 'Age (years)': '' });
      expect(Object.keys(formatted)).toEqual([ 'user', 'time', 'Gender', 'Age (years)' ]);
    });

  });

});
